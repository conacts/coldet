import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { createDebtor } from '@/lib/db/debtors';
import { createDebt } from '@/lib/db/debts';
import { createEmailThread } from '@/lib/db/email-threads';
import { createEmail } from '@/lib/db/emails';
import { handleReceivedEmail } from '@/lib/email';
import { generateResponseEmail } from '@/lib/llms';
import { sendEmail } from '@/lib/aws/ses';
import { render } from '@react-email/render';
import type { SesSnsNotification } from '@/types/aws-ses';

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

// Mock the LLM response generation
vi.mock('@/lib/llms', () => ({
  generateResponseEmail: vi.fn()
}));

// Mock the email response template
vi.mock('@/emails/email-response', () => ({
  EmailResponseEmail: vi.fn(() => '<html><body>AI Response</body></html>')
}));

const mockedSendEmail = vi.mocked(sendEmail);
const mockedRender = vi.mocked(render);
const mockedGenerateResponseEmail = vi.mocked(generateResponseEmail);

describe('User Replies to Email Flow E2E Test', () => {
  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockedRender.mockResolvedValue('<html><body>AI Response Email</body></html>');
    mockedSendEmail.mockResolvedValue('ai-response-message-id-12345');
    mockedGenerateResponseEmail.mockResolvedValue({
      subject: 'Re: Your Account Balance',
      body: 'Thank you for your inquiry. We will review your account.',
      signature: 'Best regards,\nCollection Team'
    });
  });

  describe('Complete User Reply Flow', () => {
    it('should handle a complete user reply workflow', async () => {
      // Step 1: Setup initial state (debtor, debt, initial email thread)
      const debtor = await createDebtor({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        emailConsent: true,
        currentlyCollecting: true,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Credit Card Company',
        totalOwed: 2500.00,
        status: 'active',
      });

      const initialThread = await createEmailThread(debtor.id, 'Your Outstanding Balance');
      
      // Create initial outbound email (simulating the first contact)
      const initialEmail = await createEmail({
        debtId: debt.id,
        threadId: initialThread.id,
        fromEmailAddress: 'chris@coldets.com',
        messageId: 'initial-outbound-msg-123',
        direction: 'outbound',
        subject: 'Your Outstanding Balance',
        content: 'Please contact us regarding your outstanding balance.',
        aiGenerated: true,
      });

      // Step 2: Create mock SES SNS notification for user reply
      const replyNotification: SesSnsNotification = {
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-15T10:30:00.000Z',
          source: 'jane.smith@example.com',
          messageId: 'reply-message-id-456',
          destination: ['chris@coldets.com'],
          headers: [
            { name: 'From', value: 'jane.smith@example.com' },
            { name: 'To', value: 'chris@coldets.com' },
            { name: 'Subject', value: 'Re: Your Outstanding Balance' },
            { name: 'In-Reply-To', value: '<initial-outbound-msg-123@coldets.com>' },
            { name: 'References', value: '<initial-outbound-msg-123@coldets.com>' },
            { name: 'Date', value: 'Mon, 15 Jan 2024 10:30:00 +0000' },
          ],
          commonHeaders: {
            returnPath: 'jane.smith@example.com',
            from: ['jane.smith@example.com'],
            date: 'Mon, 15 Jan 2024 10:30:00 +0000',
            to: ['chris@coldets.com'],
            messageId: 'reply-message-id-456',
            subject: 'Re: Your Outstanding Balance',
          },
        },
        receipt: {
          timestamp: '2024-01-15T10:30:00.000Z',
          recipients: ['chris@coldets.com'],
          action: {
            type: 'SNS',
            topicArn: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
            encoding: 'UTF8',
            payloadType: 'json',
          },
          processingTimeMillis: 100,
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' },
          spfVerdict: { status: 'PASS' },
          dkimVerdict: { status: 'PASS' },
          dmarcVerdict: { status: 'PASS' },
        },
        content: 'Hi, I received your email about my outstanding balance. I would like to discuss payment options. Can you please call me at 555-123-4567? Thank you.',
      };

      // Step 3: Process the received email
      await handleReceivedEmail(replyNotification);

      // Step 4: Verify the inbound email was created
      const inboundEmails = await client.query(`
        SELECT * FROM emails 
        WHERE message_id = $1 AND direction = 'inbound'
      `, ['reply-message-id-456']);

      expect(inboundEmails.rows).toHaveLength(1);
      const inboundEmail = inboundEmails.rows[0];
      expect(inboundEmail.debt_id).toBe(debt.id);
      expect(inboundEmail.thread_id).toBe(initialThread.id);
      expect(inboundEmail.from_email_address).toBe('jane.smith@example.com');
      expect(inboundEmail.direction).toBe('inbound');
      expect(inboundEmail.subject).toBe('Re: Your Outstanding Balance');
      expect(inboundEmail.content).toBe('Hi, I received your email about my outstanding balance. I would like to discuss payment options. Can you please call me at 555-123-4567? Thank you.');
      expect(inboundEmail.reply_to).toBe('initial-outbound-msg-123');

      // Step 5: Verify the AI response was generated
      expect(mockedGenerateResponseEmail).toHaveBeenCalledOnce();
      const generateCallArgs = mockedGenerateResponseEmail.mock.calls[0];
      expect(generateCallArgs[1]).toEqual(debt); // Debt object passed correctly

      // Step 6: Verify the AI response email was sent
      expect(mockedSendEmail).toHaveBeenCalledOnce();
      expect(mockedSendEmail).toHaveBeenCalledWith({
        to: 'jane.smith@example.com',
        from: expect.any(String),
        subject: 'Re: Your Account Balance',
        htmlBody: '<html><body>AI Response Email</body></html>',
        configurationSetName: 'email-tracking-config',
      });

      // Step 7: Verify the AI response was saved to database
      const aiResponseEmails = await client.query(`
        SELECT * FROM emails 
        WHERE message_id = $1 AND direction = 'outbound'
      `, ['ai-response-message-id-12345']);

      expect(aiResponseEmails.rows).toHaveLength(1);
      const aiResponseEmail = aiResponseEmails.rows[0];
      expect(aiResponseEmail.debt_id).toBe(debt.id);
      expect(aiResponseEmail.thread_id).toBe(initialThread.id);
      expect(aiResponseEmail.direction).toBe('outbound');
      expect(aiResponseEmail.subject).toBe('Re: Your Account Balance');
      expect(aiResponseEmail.ai_generated).toBe(true);
      expect(aiResponseEmail.reply_to).toBe('reply-message-id-456');

      // Step 8: Verify the complete email thread
      const allThreadEmails = await client.query(`
        SELECT * FROM emails 
        WHERE thread_id = $1 
        ORDER BY timestamp ASC
      `, [initialThread.id]);

      expect(allThreadEmails.rows).toHaveLength(3); // Initial + Inbound + AI Response
      expect(allThreadEmails.rows[0].message_id).toBe('initial-outbound-msg-123');
      expect(allThreadEmails.rows[1].message_id).toBe('reply-message-id-456');
      expect(allThreadEmails.rows[2].message_id).toBe('ai-response-message-id-12345');
    });

    it('should handle reply to existing thread using In-Reply-To header', async () => {
      // Create initial setup
      const debtor = await createDebtor({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        emailConsent: true,
        currentlyCollecting: true,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Medical Bills Inc',
        totalOwed: 1500.00,
        status: 'active',
      });

      const thread = await createEmailThread(debtor.id, 'Medical Bill Payment');
      
      const previousEmail = await createEmail({
        debtId: debt.id,
        threadId: thread.id,
        fromEmailAddress: 'chris@coldets.com',
        messageId: 'previous-msg-789',
        direction: 'outbound',
        subject: 'Medical Bill Payment',
        content: 'Please review your medical bill payment options.',
      });

      // Mock reply notification with In-Reply-To header
      const replyNotification: SesSnsNotification = {
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-15T11:00:00.000Z',
          source: 'john.doe@example.com',
          messageId: 'reply-to-existing-thread-123',
          destination: ['chris@coldets.com'],
          headers: [
            { name: 'In-Reply-To', value: '<previous-msg-789@coldets.com>' },
            { name: 'References', value: '<previous-msg-789@coldets.com>' },
          ],
          commonHeaders: {
            returnPath: 'john.doe@example.com',
            from: ['john.doe@example.com'],
            date: 'Mon, 15 Jan 2024 11:00:00 +0000',
            to: ['chris@coldets.com'],
            messageId: 'reply-to-existing-thread-123',
            subject: 'Re: Medical Bill Payment',
          },
        },
        receipt: {
          timestamp: '2024-01-15T11:00:00.000Z',
          recipients: ['chris@coldets.com'],
          action: {
            type: 'SNS',
            topicArn: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
            encoding: 'UTF8',
            payloadType: 'json',
          },
          processingTimeMillis: 100,
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' },
          spfVerdict: { status: 'PASS' },
          dkimVerdict: { status: 'PASS' },
          dmarcVerdict: { status: 'PASS' },
        },
        content: 'I can pay $500 now and $1000 in 30 days. Please confirm if this is acceptable.',
      };

      // Process the reply
      await handleReceivedEmail(replyNotification);

      // Verify the reply was added to the existing thread
      const threadEmails = await client.query(`
        SELECT * FROM emails 
        WHERE thread_id = $1 
        ORDER BY timestamp ASC
      `, [thread.id]);

      expect(threadEmails.rows).toHaveLength(3); // Previous + Inbound + AI Response
      expect(threadEmails.rows[1].message_id).toBe('reply-to-existing-thread-123');
      expect(threadEmails.rows[1].thread_id).toBe(thread.id);
      expect(threadEmails.rows[1].reply_to).toBe('previous-msg-789');
    });

    it('should create new thread when no existing thread found', async () => {
      // Create debtor with existing debt but no email thread
      const debtor = await createDebtor({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        emailConsent: true,
        currentlyCollecting: true,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Student Loan Corp',
        totalOwed: 5000.00,
        status: 'active',
      });

      // Mock notification from debtor with no existing thread
      const newThreadNotification: SesSnsNotification = {
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-15T12:00:00.000Z',
          source: 'alice.johnson@example.com',
          messageId: 'new-thread-msg-999',
          destination: ['chris@coldets.com'],
          headers: [
            { name: 'From', value: 'alice.johnson@example.com' },
            { name: 'To', value: 'chris@coldets.com' },
            { name: 'Subject', value: 'Question about my student loan' },
          ],
          commonHeaders: {
            returnPath: 'alice.johnson@example.com',
            from: ['alice.johnson@example.com'],
            date: 'Mon, 15 Jan 2024 12:00:00 +0000',
            to: ['chris@coldets.com'],
            messageId: 'new-thread-msg-999',
            subject: 'Question about my student loan',
          },
        },
        receipt: {
          timestamp: '2024-01-15T12:00:00.000Z',
          recipients: ['chris@coldets.com'],
          action: {
            type: 'SNS',
            topicArn: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
            encoding: 'UTF8',
            payloadType: 'json',
          },
          processingTimeMillis: 100,
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' },
          spfVerdict: { status: 'PASS' },
          dkimVerdict: { status: 'PASS' },
          dmarcVerdict: { status: 'PASS' },
        },
        content: 'I have a question about my student loan balance. Can you provide more details?',
      };

      // Process the email
      await handleReceivedEmail(newThreadNotification);

      // Verify a new thread was created
      const threads = await client.query(`
        SELECT * FROM email_threads 
        WHERE debtor_id = $1 AND subject = $2
      `, [debtor.id, 'Question about my student loan']);

      expect(threads.rows).toHaveLength(1);
      const newThread = threads.rows[0];

      // Verify the inbound email was created in the new thread
      const inboundEmail = await client.query(`
        SELECT * FROM emails 
        WHERE thread_id = $1 AND message_id = $2
      `, [newThread.id, 'new-thread-msg-999']);

      expect(inboundEmail.rows).toHaveLength(1);
      expect(inboundEmail.rows[0].direction).toBe('inbound');
      expect(inboundEmail.rows[0].content).toBe('I have a question about my student loan balance. Can you provide more details?');
    });
  });

  describe('Error Handling in Reply Flow', () => {
    it('should handle unknown sender email', async () => {
      const unknownSenderNotification: SesSnsNotification = {
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-15T13:00:00.000Z',
          source: 'unknown@example.com',
          messageId: 'unknown-sender-msg',
          destination: ['chris@coldets.com'],
          headers: [],
          commonHeaders: {
            returnPath: 'unknown@example.com',
            from: ['unknown@example.com'],
            date: 'Mon, 15 Jan 2024 13:00:00 +0000',
            to: ['chris@coldets.com'],
            messageId: 'unknown-sender-msg',
            subject: 'Random inquiry',
          },
        },
        receipt: {
          timestamp: '2024-01-15T13:00:00.000Z',
          recipients: ['chris@coldets.com'],
          action: {
            type: 'SNS',
            topicArn: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
            encoding: 'UTF8',
            payloadType: 'json',
          },
          processingTimeMillis: 100,
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' },
          spfVerdict: { status: 'PASS' },
          dkimVerdict: { status: 'PASS' },
          dmarcVerdict: { status: 'PASS' },
        },
        content: 'This is from an unknown sender',
      };

      await expect(handleReceivedEmail(unknownSenderNotification)).rejects.toThrow('No debtor found for sender email');
    });

    it('should handle missing email content', async () => {
      const debtor = await createDebtor({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        emailConsent: true,
        currentlyCollecting: true,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Test Creditor',
        totalOwed: 1000.00,
        status: 'active',
      });

      const noContentNotification: SesSnsNotification = {
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-15T14:00:00.000Z',
          source: 'test@example.com',
          messageId: 'no-content-msg',
          destination: ['chris@coldets.com'],
          headers: [],
          commonHeaders: {
            returnPath: 'test@example.com',
            from: ['test@example.com'],
            date: 'Mon, 15 Jan 2024 14:00:00 +0000',
            to: ['chris@coldets.com'],
            messageId: 'no-content-msg',
            subject: 'Empty message',
          },
        },
        receipt: {
          timestamp: '2024-01-15T14:00:00.000Z',
          recipients: ['chris@coldets.com'],
          action: {
            type: 'SNS',
            topicArn: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
            encoding: 'UTF8',
            payloadType: 'json',
          },
          processingTimeMillis: 100,
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' },
          spfVerdict: { status: 'PASS' },
          dkimVerdict: { status: 'PASS' },
          dmarcVerdict: { status: 'PASS' },
        },
        // No content field
      };

      await expect(handleReceivedEmail(noContentNotification)).rejects.toThrow('Email content is required but was not provided');
    });

    it('should handle AI response generation failure', async () => {
      const debtor = await createDebtor({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        emailConsent: true,
        currentlyCollecting: true,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Test Creditor',
        totalOwed: 1000.00,
        status: 'active',
      });

      const aiFailureNotification: SesSnsNotification = {
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-15T15:00:00.000Z',
          source: 'test@example.com',
          messageId: 'ai-failure-msg',
          destination: ['chris@coldets.com'],
          headers: [],
          commonHeaders: {
            returnPath: 'test@example.com',
            from: ['test@example.com'],
            date: 'Mon, 15 Jan 2024 15:00:00 +0000',
            to: ['chris@coldets.com'],
            messageId: 'ai-failure-msg',
            subject: 'AI failure test',
          },
        },
        receipt: {
          timestamp: '2024-01-15T15:00:00.000Z',
          recipients: ['chris@coldets.com'],
          action: {
            type: 'SNS',
            topicArn: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
            encoding: 'UTF8',
            payloadType: 'json',
          },
          processingTimeMillis: 100,
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' },
          spfVerdict: { status: 'PASS' },
          dkimVerdict: { status: 'PASS' },
          dmarcVerdict: { status: 'PASS' },
        },
        content: 'This should trigger AI failure',
      };

      // Mock AI response generation failure
      mockedGenerateResponseEmail.mockRejectedValue(new Error('AI service unavailable'));

      await expect(handleReceivedEmail(aiFailureNotification)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('Data Validation in Reply Flow', () => {
    it('should handle special characters in email content', async () => {
      const debtor = await createDebtor({
        firstName: 'María',
        lastName: 'González',
        email: 'maria.gonzalez@example.com',
        emailConsent: true,
        currentlyCollecting: true,
      });

      const debt = await createDebt({
        debtorId: debtor.id,
        originalCreditor: 'Banco Internacional',
        totalOwed: 3000.00,
        status: 'active',
      });

      const unicodeNotification: SesSnsNotification = {
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-15T16:00:00.000Z',
          source: 'maria.gonzalez@example.com',
          messageId: 'unicode-msg-123',
          destination: ['chris@coldets.com'],
          headers: [],
          commonHeaders: {
            returnPath: 'maria.gonzalez@example.com',
            from: ['maria.gonzalez@example.com'],
            date: 'Mon, 15 Jan 2024 16:00:00 +0000',
            to: ['chris@coldets.com'],
            messageId: 'unicode-msg-123',
            subject: 'Información sobre mi cuenta 💰',
          },
        },
        receipt: {
          timestamp: '2024-01-15T16:00:00.000Z',
          recipients: ['chris@coldets.com'],
          action: {
            type: 'SNS',
            topicArn: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
            encoding: 'UTF8',
            payloadType: 'json',
          },
          processingTimeMillis: 100,
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' },
          spfVerdict: { status: 'PASS' },
          dkimVerdict: { status: 'PASS' },
          dmarcVerdict: { status: 'PASS' },
        },
        content: 'Hola, necesito información sobre mi cuenta. ¿Pueden ayudarme con el pago? Gracias 🙏',
      };

      await handleReceivedEmail(unicodeNotification);

      // Verify Unicode characters are handled correctly
      const inboundEmail = await client.query(`
        SELECT * FROM emails 
        WHERE message_id = $1
      `, ['unicode-msg-123']);

      expect(inboundEmail.rows).toHaveLength(1);
      expect(inboundEmail.rows[0].subject).toBe('Información sobre mi cuenta 💰');
      expect(inboundEmail.rows[0].content).toBe('Hola, necesito información sobre mi cuenta. ¿Pueden ayudarme con el pago? Gracias 🙏');
    });
  });
});