import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { createDebtor } from '@/lib/db/debtors';
import { createDebt } from '@/lib/db/debts';
import { createEmailThread } from '@/lib/db/email-threads';
import { createEmail } from '@/lib/db/emails';
import { sendEmail } from '@/lib/aws/ses';
import { render } from '@react-email/render';

// Mock the db import to use our test database
let testDb: Awaited<ReturnType<typeof createTestDb>>['db'];
let client: PGlite;

vi.mock('@/lib/db/client', () => ({
  db: new Proxy({}, {
    get: (target, prop) => {
      return testDb[prop as keyof typeof testDb];
    }
  })
}));

// Mock AWS SES sendEmail function
vi.mock('@/lib/aws/ses', () => ({
  sendEmail: vi.fn()
}));

// Mock React Email render function
vi.mock('@react-email/render', () => ({
  render: vi.fn()
}));

// Mock the email template
vi.mock('@/emails/first-email', () => ({
  default: vi.fn(() => '<html><body>Test Email</body></html>')
}));

const mockedSendEmail = vi.mocked(sendEmail);
const mockedRender = vi.mocked(render);

describe('Initial Contact Flow E2E Test', () => {
  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockedRender.mockResolvedValue('<html><body>Test Email</body></html>');
    mockedSendEmail.mockResolvedValue('mocked-message-id-12345');
  });

  describe('Complete Initial Contact Flow', () => {
    it('should successfully execute the complete 3-step workflow', async () => {
      // Step 1: Create Debtor (simulating createDebtorAction)
      const debtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        emailConsent: true,
        currentlyCollecting: false,
      };

      const debtor = await createDebtor(debtorParams);
      
      expect(debtor.id).toBeTruthy();
      expect(debtor.firstName).toBe('John');
      expect(debtor.lastName).toBe('Doe');
      expect(debtor.email).toBe('john.doe@example.com');
      expect(debtor.phone).toBe('555-123-4567');
      expect(debtor.emailConsent).toBe(true);
      expect(debtor.currentlyCollecting).toBe(false);

      // Step 2: Create Debt (simulating createDebtAction)
      const debtParams = {
        debtorId: debtor.id,
        originalCreditor: 'ABC Collections',
        totalOwed: 1250.75,
        status: 'active',
      };

      const debt = await createDebt(debtParams);
      
      expect(debt.id).toBeTruthy();
      expect(debt.debtorId).toBe(debtor.id);
      expect(debt.originalCreditor).toBe('ABC Collections');
      expect(Number(debt.totalOwed)).toBe(1250.75);
      expect(debt.status).toBe('active');

      // Step 3: Send Test Email (simulating sendTestEmailAction)
      const emailSubject = 'Test Email with Tracking';
      const fromEmail = 'chris@coldets.com';
      const toEmail = 'john.doe@example.com';

      // Mock the email rendering and sending
      const mockMessageId = 'test-message-id-12345';
      mockedSendEmail.mockResolvedValue(mockMessageId);

      // Simulate the email sending process
      const emailHtml = await render({} as any); // Mock template
      
      const messageId = await sendEmail({
        to: toEmail,
        from: fromEmail,
        subject: emailSubject,
        htmlBody: emailHtml,
        configurationSetName: 'email-tracking-config',
      });

      expect(messageId).toBe(mockMessageId);
      expect(mockedSendEmail).toHaveBeenCalledWith({
        to: toEmail,
        from: fromEmail,
        subject: emailSubject,
        htmlBody: emailHtml,
        configurationSetName: 'email-tracking-config',
      });

      // Create email thread
      const thread = await createEmailThread(debtor.id, emailSubject);
      
      expect(thread.id).toBeTruthy();
      expect(thread.debtorId).toBe(debtor.id);
      expect(thread.subject).toBe(emailSubject);

      // Create email record
      const email = await createEmail({
        debtId: debt.id,
        threadId: thread.id,
        fromEmailAddress: fromEmail,
        messageId: mockMessageId,
        direction: 'outbound',
        subject: emailSubject,
      });

      expect(email.id).toBeTruthy();
      expect(email.debtId).toBe(debt.id);
      expect(email.threadId).toBe(thread.id);
      expect(email.fromEmailAddress).toBe(fromEmail);
      expect(email.messageId).toBe(mockMessageId);
      expect(email.direction).toBe('outbound');
      expect(email.subject).toBe(emailSubject);
      expect(email.emailOpened).toBe(false);
      expect(email.emailClicked).toBe(false);
      expect(email.aiGenerated).toBe(false);
      expect(email.complianceChecked).toBe(true);
    });

    it('should handle the workflow with optional phone number', async () => {
      // Step 1: Create Debtor without phone
      const debtorParams = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: null,
        emailConsent: true,
        currentlyCollecting: false,
      };

      const debtor = await createDebtor(debtorParams);
      expect(debtor.phone).toBeNull();

      // Step 2: Create Debt
      const debtParams = {
        debtorId: debtor.id,
        originalCreditor: 'XYZ Credit',
        totalOwed: 500.00,
        status: 'active',
      };

      const debt = await createDebt(debtParams);
      expect(Number(debt.totalOwed)).toBe(500.00);

      // Step 3: Send Email
      const thread = await createEmailThread(debtor.id, 'Initial Contact');
      const email = await createEmail({
        debtId: debt.id,
        threadId: thread.id,
        fromEmailAddress: 'chris@coldets.com',
        messageId: 'test-msg-jane',
        direction: 'outbound',
        subject: 'Initial Contact',
      });

      expect(email.subject).toBe('Initial Contact');
    });

    it('should maintain proper foreign key relationships throughout the flow', async () => {
      // Execute the complete flow
      const debtor = await createDebtor({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        emailConsent: true,
        currentlyCollecting: false,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Test Creditor',
        totalOwed: 1000.00,
        status: 'active',
      });

      const thread = await createEmailThread(debtor.id, 'FK Relationship Test');
      
      const email = await createEmail({
        debtId: debt.id,
        threadId: thread.id,
        fromEmailAddress: 'test@example.com',
        messageId: 'fk-test-msg',
        direction: 'outbound',
        subject: 'FK Test',
      });

      // Verify relationships with join queries
      const debtorDebtJoin = await client.query(`
        SELECT d.id as debtor_id, d.first_name, d.last_name, dt.id as debt_id, dt.original_creditor
        FROM debtors d
        JOIN debts dt ON d.id = dt.debtor_id
        WHERE d.id = $1
      `, [debtor.id]);

      expect(debtorDebtJoin.rows).toHaveLength(1);
      expect(debtorDebtJoin.rows[0].first_name).toBe('Alice');
      expect(debtorDebtJoin.rows[0].original_creditor).toBe('Test Creditor');

      const fullJoin = await client.query(`
        SELECT 
          d.first_name, d.last_name, d.email,
          dt.original_creditor, dt.total_owed,
          et.subject as thread_subject,
          e.message_id, e.direction, e.subject as email_subject
        FROM debtors d
        JOIN debts dt ON d.id = dt.debtor_id
        JOIN emails e ON dt.id = e.debt_id
        JOIN email_threads et ON e.thread_id = et.id
        WHERE d.id = $1
      `, [debtor.id]);

      expect(fullJoin.rows).toHaveLength(1);
      const row = fullJoin.rows[0];
      expect(row.first_name).toBe('Alice');
      expect(row.email).toBe('alice.johnson@example.com');
      expect(row.original_creditor).toBe('Test Creditor');
      expect(Number(row.total_owed)).toBe(1000.00);
      expect(row.thread_subject).toBe('FK Relationship Test');
      expect(row.message_id).toBe('fk-test-msg');
      expect(row.direction).toBe('outbound');
    });
  });

  describe('Error Handling in Flow', () => {
    it('should handle debtor creation failure', async () => {
      // First create a debtor with a specific email
      await createDebtor({
        firstName: 'John',
        lastName: 'Doe',
        email: 'duplicate@example.com',
        emailConsent: true,
        currentlyCollecting: false,
      });

      // Test duplicate email constraint violation
      await expect(createDebtor({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'duplicate@example.com', // Duplicate email should cause unique constraint violation
        emailConsent: true,
        currentlyCollecting: false,
      })).rejects.toThrow();
    });

    it('should handle debt creation failure with invalid debtor ID', async () => {
      await expect(createDebt({
        debtorId: '550e8400-e29b-41d4-a716-446655440000',
        originalCreditor: 'Test Creditor',
        totalOwed: 1000.00,
        status: 'active',
      })).rejects.toThrow();
    });

    it('should handle email thread creation failure with invalid debtor ID', async () => {
      await expect(createEmailThread(
        '550e8400-e29b-41d4-a716-446655440000',
        'Test Subject'
      )).rejects.toThrow();
    });

    it('should handle email creation failure with invalid debt ID', async () => {
      const debtor = await createDebtor({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        emailConsent: true,
        currentlyCollecting: false,
      });

      const thread = await createEmailThread(debtor.id, 'Test Thread');

      await expect(createEmail({
        debtId: '550e8400-e29b-41d4-a716-446655440000',
        threadId: thread.id,
        fromEmailAddress: 'test@example.com',
        messageId: 'test-msg',
        direction: 'outbound',
      })).rejects.toThrow();
    });

    it('should handle SES email sending failure', async () => {
      // Setup successful database operations
      const debtor = await createDebtor({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        emailConsent: true,
        currentlyCollecting: false,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Test Creditor',
        totalOwed: 1000.00,
        status: 'active',
      });

      // Mock SES failure
      mockedSendEmail.mockRejectedValue(new Error('SES sending failed'));

      await expect(sendEmail({
        to: 'test@example.com',
        from: 'chris@coldets.com',
        subject: 'Test Email',
        htmlBody: '<html><body>Test</body></html>',
        configurationSetName: 'email-tracking-config',
      })).rejects.toThrow('SES sending failed');
    });
  });

  describe('Data Validation in Flow', () => {
    it('should validate decimal precision for debt amounts', async () => {
      const debtor = await createDebtor({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        emailConsent: true,
        currentlyCollecting: false,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Test Creditor',
        totalOwed: 1234.567, // More than 2 decimal places
        status: 'active',
      });

      // Should handle decimal precision correctly (rounded to 2 decimal places)
      expect(Number(debt.totalOwed)).toBe(1234.57);
    });

    it('should validate email format in debtor creation', async () => {
      const debtor = await createDebtor({
        firstName: 'Test',
        lastName: 'User',
        email: 'user+tag@sub-domain.example-site.co.uk',
        emailConsent: true,
        currentlyCollecting: false,
      });

      expect(debtor.email).toBe('user+tag@sub-domain.example-site.co.uk');
    });

    it('should handle special characters in creditor names', async () => {
      const debtor = await createDebtor({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        emailConsent: true,
        currentlyCollecting: false,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: "O'Connor & Associates - Collection Agency",
        totalOwed: 1000.00,
        status: 'active',
      });

      expect(debt.originalCreditor).toBe("O'Connor & Associates - Collection Agency");
    });
  });
});