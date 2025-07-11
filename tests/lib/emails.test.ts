import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { 
  createEmail,
  getEmailById,
  getEmailByMessageId,
  updateEmailOpened,
  updateEmailClicked,
  updateEmailBounced,
  updateEmailComplained
} from '@/lib/db/emails';
import { createDebtor, type CreateDebtorParams } from '@/lib/db/debtors';
import { createDebt, type CreateDebtParams } from '@/lib/db/debts';
import { createEmailThread } from '@/lib/db/email-threads';

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

describe('Emails Database Operations', () => {
  let testDebtorId: string;
  let testDebtId: string;
  let testThreadId: string;

  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);

    // Create test debtor, debt, and thread for foreign key relationships
    const debtorParams: CreateDebtorParams = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    };
    const debtor = await createDebtor(debtorParams);
    testDebtorId = debtor.id;

    const debtParams: CreateDebtParams = {
      debtorId: testDebtorId,
      originalCreditor: 'Test Creditor',
      totalOwed: 1000.00,
    };
    const debt = await createDebt(debtParams);
    testDebtId = debt.id;

    const thread = await createEmailThread(testDebtorId, 'Test Thread Subject');
    testThreadId = thread.id;
  });

  describe('createEmail', () => {
    it('should create email with all parameters', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'sender@example.com',
        messageId: 'msg-12345',
        direction: 'inbound' as const,
        subject: 'Account Balance Inquiry',
        content: 'I would like to know my current balance.',
        emailOpened: true,
        emailClicked: false,
        aiGenerated: false,
        complianceChecked: true,
        replyTo: 'reply-to-msg-67890',
      };

      const result = await createEmail(emailParams);

      expect(result.debtId).toBe(testDebtId);
      expect(result.threadId).toBe(testThreadId);
      expect(result.fromEmailAddress).toBe('sender@example.com');
      expect(result.messageId).toBe('msg-12345');
      expect(result.direction).toBe('inbound');
      expect(result.subject).toBe('Account Balance Inquiry');
      expect(result.content).toBe('I would like to know my current balance.');
      expect(result.emailOpened).toBe(true);
      expect(result.emailClicked).toBe(false);
      expect(result.aiGenerated).toBe(false);
      expect(result.complianceChecked).toBe(true);
      expect(result.replyTo).toBe('reply-to-msg-67890');
      expect(result.id).toBeTruthy();
      expect(result.timestamp).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
    });

    it('should create email with minimal required parameters', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'minimal@example.com',
        messageId: 'minimal-msg',
        direction: 'outbound' as const,
      };

      const result = await createEmail(emailParams);

      expect(result.debtId).toBe(testDebtId);
      expect(result.threadId).toBe(testThreadId);
      expect(result.fromEmailAddress).toBe('minimal@example.com');
      expect(result.messageId).toBe('minimal-msg');
      expect(result.direction).toBe('outbound');
      expect(result.subject).toBeNull();
      expect(result.content).toBeNull();
      expect(result.emailOpened).toBe(false);
      expect(result.emailClicked).toBe(false);
      expect(result.aiGenerated).toBe(false);
      expect(result.complianceChecked).toBe(true);
      expect(result.replyTo).toBeNull();
    });

    it('should create email with null subject and content', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'null-content@example.com',
        messageId: 'null-content-msg',
        direction: 'inbound' as const,
        subject: null,
        content: null,
      };

      const result = await createEmail(emailParams);

      expect(result.subject).toBeNull();
      expect(result.content).toBeNull();
    });

    it('should handle Unicode characters in subject and content', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'unicode@example.com',
        messageId: 'unicode-msg',
        direction: 'inbound' as const,
        subject: 'Información de Cuenta - München Bank 💰',
        content: 'Hola, necesito información sobre mi cuenta. ¿Pueden ayudarme? 🙏',
      };

      const result = await createEmail(emailParams);

      expect(result.subject).toBe('Información de Cuenta - München Bank 💰');
      expect(result.content).toBe('Hola, necesito información sobre mi cuenta. ¿Pueden ayudarme? 🙏');
    });

    it('should enforce unique messageId constraint', async () => {
      const emailParams1 = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'first@example.com',
        messageId: 'duplicate-msg-id',
        direction: 'inbound' as const,
      };

      const emailParams2 = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'second@example.com',
        messageId: 'duplicate-msg-id', // Same messageId
        direction: 'outbound' as const,
      };

      await createEmail(emailParams1);

      await expect(createEmail(emailParams2)).rejects.toThrow();
    });

    it('should throw error when debt does not exist', async () => {
      const emailParams = {
        debtId: '550e8400-e29b-41d4-a716-446655440000',
        threadId: testThreadId,
        fromEmailAddress: 'invalid@example.com',
        messageId: 'invalid-debt-msg',
        direction: 'inbound' as const,
      };

      await expect(createEmail(emailParams)).rejects.toThrow();
    });

    it('should throw error when thread does not exist', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: '550e8400-e29b-41d4-a716-446655440000',
        fromEmailAddress: 'invalid@example.com',
        messageId: 'invalid-thread-msg',
        direction: 'inbound' as const,
      };

      await expect(createEmail(emailParams)).rejects.toThrow();
    });

    it('should validate direction enum constraint', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'invalid@example.com',
        messageId: 'invalid-direction-msg',
        direction: 'invalid' as any,
      };

      await expect(createEmail(emailParams)).rejects.toThrow();
    });
  });

  describe('getEmailById', () => {
    it('should return email when found', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'test@example.com',
        messageId: 'test-msg-id',
        direction: 'inbound' as const,
        subject: 'Test Subject',
      };

      const created = await createEmail(emailParams);
      const result = await getEmailById(created.id);

      expect(result?.id).toBe(created.id);
      expect(result?.messageId).toBe('test-msg-id');
      expect(result?.subject).toBe('Test Subject');
    });

    it('should return null when email not found', async () => {
      const result = await getEmailById('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });
  });

  describe('getEmailByMessageId', () => {
    it('should return email when found by messageId', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'test@example.com',
        messageId: 'unique-message-id',
        direction: 'outbound' as const,
        subject: 'Message ID Test',
      };

      const created = await createEmail(emailParams);
      const result = await getEmailByMessageId('unique-message-id');

      expect(result?.id).toBe(created.id);
      expect(result?.messageId).toBe('unique-message-id');
      expect(result?.subject).toBe('Message ID Test');
    });

    it('should return null when messageId not found', async () => {
      const result = await getEmailByMessageId('non-existent-message-id');
      expect(result).toBeNull();
    });
  });

  describe('updateEmailOpened', () => {
    it('should update emailOpened to true', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'test@example.com',
        messageId: 'opened-test-msg',
        direction: 'outbound' as const,
        emailOpened: false,
      };

      await createEmail(emailParams);
      const result = await updateEmailOpened('opened-test-msg');

      expect(result?.messageId).toBe('opened-test-msg');
      expect(result?.emailOpened).toBe(true);
    });

    it('should return null when messageId not found', async () => {
      const result = await updateEmailOpened('non-existent-message-id');
      expect(result).toBeNull();
    });

    it('should handle already opened email', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'test@example.com',
        messageId: 'already-opened-msg',
        direction: 'outbound' as const,
        emailOpened: true,
      };

      await createEmail(emailParams);
      const result = await updateEmailOpened('already-opened-msg');

      expect(result?.emailOpened).toBe(true);
    });
  });

  describe('updateEmailClicked', () => {
    it('should update emailClicked to true', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'test@example.com',
        messageId: 'clicked-test-msg',
        direction: 'outbound' as const,
        emailClicked: false,
      };

      await createEmail(emailParams);
      const result = await updateEmailClicked('clicked-test-msg');

      expect(result?.messageId).toBe('clicked-test-msg');
      expect(result?.emailClicked).toBe(true);
    });

    it('should return null when messageId not found', async () => {
      const result = await updateEmailClicked('non-existent-message-id');
      expect(result).toBeNull();
    });
  });

  describe('updateEmailBounced', () => {
    it('should update emailBounced to true', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'test@example.com',
        messageId: 'bounced-test-msg',
        direction: 'outbound' as const,
        emailBounced: false,
      };

      await createEmail(emailParams);
      const result = await updateEmailBounced('bounced-test-msg');

      expect(result?.messageId).toBe('bounced-test-msg');
      expect(result?.emailBounced).toBe(true);
    });

    it('should return null when messageId not found', async () => {
      const result = await updateEmailBounced('non-existent-message-id');
      expect(result).toBeNull();
    });
  });

  describe('updateEmailComplained', () => {
    it('should update emailComplained to true', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'test@example.com',
        messageId: 'complained-test-msg',
        direction: 'outbound' as const,
        emailComplained: false,
      };

      await createEmail(emailParams);
      const result = await updateEmailComplained('complained-test-msg');

      expect(result?.messageId).toBe('complained-test-msg');
      expect(result?.emailComplained).toBe(true);
    });

    it('should return null when messageId not found', async () => {
      const result = await updateEmailComplained('non-existent-message-id');
      expect(result).toBeNull();
    });
  });

  describe('Email tracking workflow', () => {
    it('should handle complete email engagement workflow', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'engagement@example.com',
        messageId: 'engagement-workflow-msg',
        direction: 'outbound' as const,
        subject: 'Payment Reminder',
        content: 'Please click here to make a payment.',
      };

      // Create email
      const created = await createEmail(emailParams);
      expect(created.emailOpened).toBe(false);
      expect(created.emailClicked).toBe(false);
      expect(created.emailBounced).toBe(false);
      expect(created.emailComplained).toBe(false);

      // Email opened
      const opened = await updateEmailOpened('engagement-workflow-msg');
      expect(opened?.emailOpened).toBe(true);

      // Email clicked
      const clicked = await updateEmailClicked('engagement-workflow-msg');
      expect(clicked?.emailOpened).toBe(true);
      expect(clicked?.emailClicked).toBe(true);

      // Verify final state
      const final = await getEmailByMessageId('engagement-workflow-msg');
      expect(final?.emailOpened).toBe(true);
      expect(final?.emailClicked).toBe(true);
      expect(final?.emailBounced).toBe(false);
      expect(final?.emailComplained).toBe(false);
    });

    it('should handle bounced email scenario', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'bounce@example.com',
        messageId: 'bounced-workflow-msg',
        direction: 'outbound' as const,
        subject: 'Bounced Email Test',
      };

      await createEmail(emailParams);
      
      // Email bounced
      const bounced = await updateEmailBounced('bounced-workflow-msg');
      expect(bounced?.emailBounced).toBe(true);
      expect(bounced?.emailOpened).toBe(false); // Shouldn't be opened if bounced
    });
  });

  describe('Edge cases and data integrity', () => {
    it('should maintain foreign key relationships', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'fk-test@example.com',
        messageId: 'fk-test-msg',
        direction: 'inbound' as const,
        subject: 'FK Test',
      };

      const email = await createEmail(emailParams);

      // Verify relationships exist with a join query
      const result = await client.query(`
        SELECT e.*, d.first_name, d.last_name, dt.original_creditor, et.subject as thread_subject
        FROM emails e 
        JOIN debts dt ON e.debt_id = dt.id
        JOIN debtors d ON dt.debtor_id = d.id 
        JOIN email_threads et ON e.thread_id = et.id
        WHERE e.id = $1
      `, [email.id]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].first_name).toBe('John');
      expect(result.rows[0].last_name).toBe('Doe');
      expect(result.rows[0].original_creditor).toBe('Test Creditor');
      expect(result.rows[0].thread_subject).toBe('Test Thread Subject');
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000); // Test large TEXT field
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'long-content@example.com',
        messageId: 'long-content-msg',
        direction: 'inbound' as const,
        content: longContent,
      };

      const result = await createEmail(emailParams);
      expect(result.content).toBe(longContent);
    });

    it('should handle special characters in email addresses', async () => {
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'user+tag@sub-domain.example-site.co.uk',
        messageId: 'special-chars-msg',
        direction: 'inbound' as const,
      };

      const result = await createEmail(emailParams);
      expect(result.fromEmailAddress).toBe('user+tag@sub-domain.example-site.co.uk');
    });

    it('should handle HTML content in email body', async () => {
      const htmlContent = '<html><body><p>Hello <strong>John</strong>,</p><p>Your balance is <em>$1,000</em>.</p></body></html>';
      const emailParams = {
        debtId: testDebtId,
        threadId: testThreadId,
        fromEmailAddress: 'html@example.com',
        messageId: 'html-content-msg',
        direction: 'outbound' as const,
        content: htmlContent,
      };

      const result = await createEmail(emailParams);
      expect(result.content).toBe(htmlContent);
    });
  });
});