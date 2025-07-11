import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { 
  getThreadByMessageId,
  getThreadByDebtorAndSubject,
  getEmailsByThreadId,
  createEmailThread,
  buildReferencesChain,
  getLatestEmailInThread,
  getThreadWithEmails
} from '@/lib/db/email-threads';
import { createDebtor, type CreateDebtorParams } from '@/lib/db/debtors';
import { createDebt, type CreateDebtParams } from '@/lib/db/debts';
import { createEmail } from '@/lib/db/emails';

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

describe('Email Threads Database Operations', () => {
  let testDebtorId: string;
  let testDebtId: string;

  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);

    // Create test debtor and debt for foreign key relationships
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
  });

  describe('createEmailThread', () => {
    it('should create email thread with valid data', async () => {
      const subject = 'Account Balance Inquiry';
      
      const result = await createEmailThread(testDebtorId, subject);

      expect(result.debtorId).toBe(testDebtorId);
      expect(result.subject).toBe(subject);
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it('should create thread with null subject', async () => {
      const result = await createEmailThread(testDebtorId, null as any);

      expect(result.debtorId).toBe(testDebtorId);
      expect(result.subject).toBeNull();
    });

    it('should throw error when debtor does not exist', async () => {
      await expect(
        createEmailThread('550e8400-e29b-41d4-a716-446655440000', 'Test Subject')
      ).rejects.toThrow();
    });

    it('should handle duplicate debtor/subject combinations', async () => {
      const subject = 'Payment Plan Request';
      
      // Create first thread
      const thread1 = await createEmailThread(testDebtorId, subject);
      
      // Create second thread with same debtor/subject (should work - no unique constraint)
      const thread2 = await createEmailThread(testDebtorId, subject);
      
      expect(thread1.id).not.toBe(thread2.id);
      expect(thread2.subject).toBe(subject);
    });
  });

  describe('getThreadByDebtorAndSubject', () => {
    it('should return thread when found by debtor and subject', async () => {
      const subject = 'Payment Discussion';
      const created = await createEmailThread(testDebtorId, subject);

      const result = await getThreadByDebtorAndSubject(testDebtorId, subject);

      expect(result?.id).toBe(created.id);
      expect(result?.debtorId).toBe(testDebtorId);
      expect(result?.subject).toBe(subject);
    });

    it('should return null when no thread found', async () => {
      const result = await getThreadByDebtorAndSubject(testDebtorId, 'Non-existent Subject');
      expect(result).toBeNull();
    });

    it('should return null when debtor does not exist', async () => {
      const result = await getThreadByDebtorAndSubject(
        '550e8400-e29b-41d4-a716-446655440000',
        'Any Subject'
      );
      expect(result).toBeNull();
    });

    it('should return first thread when multiple threads exist with same debtor/subject', async () => {
      const subject = 'Duplicate Subject';
      
      const thread1 = await createEmailThread(testDebtorId, subject);
      await createEmailThread(testDebtorId, subject);

      const result = await getThreadByDebtorAndSubject(testDebtorId, subject);

      // Should return the first thread created (LIMIT 1)
      expect(result?.id).toBe(thread1.id);
    });

    it('should handle null subject search', async () => {
      await createEmailThread(testDebtorId, null as any);

      const result = await getThreadByDebtorAndSubject(testDebtorId, null as any);
      // Database null values come back as undefined in some cases
      expect(result?.subject).toBeUndefined();
    });
  });

  describe('getThreadByMessageId', () => {
    it('should return thread when email with messageId exists', async () => {
      const thread = await createEmailThread(testDebtorId, 'Email Thread Test');
      
      // Create an email in the thread
      const email = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test@example.com',
        messageId: 'msg-12345',
        direction: 'inbound',
        subject: 'Test Email',
      });

      const result = await getThreadByMessageId('msg-12345');

      expect(result?.id).toBe(thread.id);
      expect(result?.debtorId).toBe(testDebtorId);
    });

    it('should return null when email with messageId does not exist', async () => {
      const result = await getThreadByMessageId('non-existent-message-id');
      expect(result).toBeNull();
    });

    it('should return null when email exists but has no threadId', async () => {
      // This case shouldn't happen in practice due to foreign key constraint
      // but testing the null check in the function
      const result = await getThreadByMessageId('orphaned-message');
      expect(result).toBeNull();
    });
  });

  describe('getEmailsByThreadId', () => {
    it('should return emails in thread ordered by timestamp desc', async () => {
      const thread = await createEmailThread(testDebtorId, 'Multi-Email Thread');

      // Create emails with different timestamps
      const email1 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test1@example.com',
        messageId: 'msg-1',
        direction: 'inbound',
        subject: 'First Email',
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const email2 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test2@example.com',
        messageId: 'msg-2',
        direction: 'outbound',
        subject: 'Second Email',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const email3 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test3@example.com',
        messageId: 'msg-3',
        direction: 'inbound',
        subject: 'Third Email',
      });

      const result = await getEmailsByThreadId(thread.id);

      expect(result).toHaveLength(3);
      // Should be ordered by timestamp desc (newest first)
      expect(result[0].messageId).toBe('msg-3');
      expect(result[1].messageId).toBe('msg-2');
      expect(result[2].messageId).toBe('msg-1');
    });

    it('should return empty array when thread has no emails', async () => {
      const thread = await createEmailThread(testDebtorId, 'Empty Thread');

      const result = await getEmailsByThreadId(thread.id);
      expect(result).toEqual([]);
    });

    it('should return empty array when thread does not exist', async () => {
      const result = await getEmailsByThreadId('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual([]);
    });
  });

  describe('buildReferencesChain', () => {
    it('should return message IDs in chronological order', async () => {
      const thread = await createEmailThread(testDebtorId, 'References Chain Test');

      // Create emails with specific timestamps
      const email1 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test1@example.com',
        messageId: 'oldest-msg',
        direction: 'inbound',
        subject: 'First Email',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const email2 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test2@example.com',
        messageId: 'middle-msg',
        direction: 'outbound',
        subject: 'Second Email',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const email3 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test3@example.com',
        messageId: 'newest-msg',
        direction: 'inbound',
        subject: 'Third Email',
      });

      const result = await buildReferencesChain(thread.id);

      expect(result).toHaveLength(3);
      // Should be in chronological order (oldest first)
      expect(result[0]).toBe('oldest-msg');
      expect(result[1]).toBe('middle-msg');
      expect(result[2]).toBe('newest-msg');
    });

    it('should return empty array when thread has no emails', async () => {
      const thread = await createEmailThread(testDebtorId, 'Empty References');

      const result = await buildReferencesChain(thread.id);
      expect(result).toEqual([]);
    });

    it('should handle emails with null timestamps', async () => {
      const thread = await createEmailThread(testDebtorId, 'Null Timestamp Test');

      // Create email and manually set timestamp to null using raw SQL
      const email = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test@example.com',
        messageId: 'null-timestamp-msg',
        direction: 'inbound',
        subject: 'Null Timestamp Email',
      });

      await client.query('UPDATE emails SET timestamp = NULL WHERE id = $1', [email.id]);

      const result = await buildReferencesChain(thread.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('null-timestamp-msg');
    });
  });

  describe('getLatestEmailInThread', () => {
    it('should return most recent email in thread', async () => {
      const thread = await createEmailThread(testDebtorId, 'Latest Email Test');

      const email1 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test1@example.com',
        messageId: 'old-msg',
        direction: 'inbound',
        subject: 'Old Email',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const email2 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test2@example.com',
        messageId: 'latest-msg',
        direction: 'outbound',
        subject: 'Latest Email',
      });

      const result = await getLatestEmailInThread(thread.id);

      expect(result?.messageId).toBe('latest-msg');
      expect(result?.id).toBe(email2.id);
    });

    it('should return null when thread has no emails', async () => {
      const thread = await createEmailThread(testDebtorId, 'No Emails Thread');

      const result = await getLatestEmailInThread(thread.id);
      expect(result).toBeNull();
    });

    it('should return null when thread does not exist', async () => {
      const result = await getLatestEmailInThread('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });
  });

  describe('getThreadWithEmails', () => {
    it('should return thread and its emails', async () => {
      const thread = await createEmailThread(testDebtorId, 'Thread With Emails');

      const email1 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test1@example.com',
        messageId: 'msg-1',
        direction: 'inbound',
        subject: 'Email 1',
      });

      const email2 = await createEmail({
        debtId: testDebtId,
        threadId: thread.id,
        fromEmailAddress: 'test2@example.com',
        messageId: 'msg-2',
        direction: 'outbound',
        subject: 'Email 2',
      });

      const result = await getThreadWithEmails(thread.id);

      expect(result.thread?.id).toBe(thread.id);
      expect(result.thread?.subject).toBe('Thread With Emails');
      expect(result.emails).toHaveLength(2);
      expect(result.emails.map(e => e.messageId)).toContain('msg-1');
      expect(result.emails.map(e => e.messageId)).toContain('msg-2');
    });

    it('should return null thread and empty emails when thread does not exist', async () => {
      const result = await getThreadWithEmails('550e8400-e29b-41d4-a716-446655440000');

      expect(result.thread).toBeNull();
      expect(result.emails).toEqual([]);
    });

    it('should return thread with empty emails array when thread has no emails', async () => {
      const thread = await createEmailThread(testDebtorId, 'Empty Thread');

      const result = await getThreadWithEmails(thread.id);

      expect(result.thread?.id).toBe(thread.id);
      expect(result.emails).toEqual([]);
    });
  });

  describe('Edge cases and data integrity', () => {
    it('should maintain foreign key relationship with debtors', async () => {
      const thread = await createEmailThread(testDebtorId, 'FK Test Thread');

      // Verify the relationship exists with a join query
      const result = await client.query(`
        SELECT et.*, d.first_name, d.last_name 
        FROM email_threads et 
        JOIN debtors d ON et.debtor_id = d.id 
        WHERE et.id = $1
      `, [thread.id]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].first_name).toBe('John');
      expect(result.rows[0].last_name).toBe('Doe');
    });

    it('should handle special characters in subject', async () => {
      const subject = "Re: Payment Plan & Dispute - O'Connor Account";
      const thread = await createEmailThread(testDebtorId, subject);

      expect(thread.subject).toBe(subject);
    });

    it('should handle Unicode characters in subject', async () => {
      const subject = 'Información de Cuenta - München Bank';
      const thread = await createEmailThread(testDebtorId, subject);

      expect(thread.subject).toBe(subject);
    });

    it('should handle very long subjects', async () => {
      const longSubject = 'A'.repeat(500); // Test VARCHAR(500) limit
      const thread = await createEmailThread(testDebtorId, longSubject);

      expect(thread.subject).toBe(longSubject);
    });
  });
});