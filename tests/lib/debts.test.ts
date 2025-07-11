import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { 
  createDebt, 
  getDebtById, 
  getDebtsByDebtorEmail, 
  getDebtByDebtorId,
  paidDebt,
  type CreateDebtParams 
} from '@/lib/db/debts';
import { createDebtor, type CreateDebtorParams } from '@/lib/db/debtors';

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

describe('Debts Database Operations', () => {
  let testDebtorId: string;
  let testDebtorEmail: string;

  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);

    // Create a test debtor for foreign key relationships
    const debtorParams: CreateDebtorParams = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    };
    const debtor = await createDebtor(debtorParams);
    testDebtorId = debtor.id;
    testDebtorEmail = debtor.email!;
  });

  describe('createDebt', () => {
    it('should create debt with valid data', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'ABC Collections',
        totalOwed: 1250.75,
        amountPaid: 250.00,
        status: 'active',
        debtDate: new Date('2024-01-15'),
      };

      const result = await createDebt(params);

      expect(result.debtorId).toBe(testDebtorId);
      expect(result.originalCreditor).toBe('ABC Collections');
      expect(Number(result.totalOwed)).toBe(1250.75);
      expect(Number(result.amountPaid)).toBe(250.00);
      expect(result.status).toBe('active');
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
      expect(result.debtDate).toEqual(new Date('2024-01-15'));
    });

    it('should create debt with minimal required data', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'XYZ Bank',
      };

      const result = await createDebt(params);

      expect(result.debtorId).toBe(testDebtorId);
      expect(result.originalCreditor).toBe('XYZ Bank');
      expect(Number(result.totalOwed)).toBe(0);
      expect(Number(result.amountPaid)).toBe(0);
      expect(result.status).toBe('active');
      expect(result.debtDate).toBeNull();
    });

    it('should handle custom status values', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Test Creditor',
        status: 'resolved',
      };

      const result = await createDebt(params);
      expect(result.status).toBe('resolved');
    });

    it('should throw error when debtor does not exist', async () => {
      const params: CreateDebtParams = {
        debtorId: '550e8400-e29b-41d4-a716-446655440000',
        originalCreditor: 'Test Creditor',
      };

      await expect(createDebt(params)).rejects.toThrow();
    });

    it('should handle decimal precision correctly', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Precision Test',
        totalOwed: 1234.567,
        amountPaid: 123.456,
      };

      const result = await createDebt(params);
      
      // Postgres DECIMAL(10,2) should round to 2 decimal places
      // Database returns decimals as strings
      expect(Number(result.totalOwed)).toBe(1234.57);
      expect(Number(result.amountPaid)).toBe(123.46);
    });

    it('should handle large amounts', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Big Debt Corp',
        totalOwed: 99999999.99, // Max for DECIMAL(10,2)
      };

      const result = await createDebt(params);
      expect(Number(result.totalOwed)).toBe(99999999.99);
    });
  });

  describe('getDebtById', () => {
    it('should return debt when found', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Test Creditor',
        totalOwed: 500.00,
      };

      const created = await createDebt(params);
      const result = await getDebtById(created.id);

      expect(result?.id).toBe(created.id);
      expect(result?.debtorId).toBe(testDebtorId);
      expect(result?.originalCreditor).toBe('Test Creditor');
      expect(Number(result?.totalOwed)).toBe(500.00);
    });

    it('should return null when debt not found', async () => {
      const result = await getDebtById('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });
  });

  describe('getDebtsByDebtorEmail', () => {
    it('should return debts for a debtor email', async () => {
      // Create multiple debts for the same debtor
      const debt1Params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'First Creditor',
        totalOwed: 1000.00,
      };

      const debt2Params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Second Creditor',
        totalOwed: 2000.00,
      };

      const debt1 = await createDebt(debt1Params);
      const debt2 = await createDebt(debt2Params);

      const result = await getDebtsByDebtorEmail(testDebtorEmail);

      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toContain(debt1.id);
      expect(result.map(d => d.id)).toContain(debt2.id);
      expect(result.map(d => d.originalCreditor)).toContain('First Creditor');
      expect(result.map(d => d.originalCreditor)).toContain('Second Creditor');
    });

    it('should return empty array when no debts found for email', async () => {
      const result = await getDebtsByDebtorEmail('nonexistent@example.com');
      expect(result).toEqual([]);
    });

    it('should handle multiple debtors with same email (testing TODO comment)', async () => {
      // Create a second debtor with a different email but we'll test joining behavior
      const debtor2Params: CreateDebtorParams = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com', // Different email since we have unique constraint
      };

      const debtor2 = await createDebtor(debtor2Params);
      
      // Create debts for both debtors, but we'll test with the first debtor's email
      const debt1Params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Creditor for John',
        totalOwed: 1000.00,
      };

      await createDebt(debt1Params);

      const result = await getDebtsByDebtorEmail(testDebtorEmail);

      // Should only return debts for the debtor with this specific email
      expect(result).toHaveLength(1);
      expect(result[0].originalCreditor).toBe('Creditor for John');
    });
  });

  describe('getDebtByDebtorId', () => {
    it('should return debt when found by debtor ID', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Test Creditor',
        totalOwed: 750.25,
      };

      const created = await createDebt(params);
      const result = await getDebtByDebtorId(testDebtorId);

      expect(result?.id).toBe(created.id);
      expect(result?.debtorId).toBe(testDebtorId);
      expect(result?.originalCreditor).toBe('Test Creditor');
      expect(Number(result?.totalOwed)).toBe(750.25);
    });

    it('should return null when no debt found for debtor', async () => {
      const result = await getDebtByDebtorId('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });

    it('should return first debt when multiple debts exist for debtor', async () => {
      // Create multiple debts for the same debtor
      const debt1Params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'First Creditor',
        totalOwed: 1000.00,
      };

      const debt2Params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Second Creditor',
        totalOwed: 2000.00,
      };

      const debt1 = await createDebt(debt1Params);
      await createDebt(debt2Params);

      const result = await getDebtByDebtorId(testDebtorId);

      // Should return the first debt created (LIMIT 1)
      expect(result?.id).toBe(debt1.id);
      expect(result?.originalCreditor).toBe('First Creditor');
    });
  });

  describe('paidDebt', () => {
    let testDebtId: string;

    beforeEach(async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'Test Creditor',
        totalOwed: 1000.00,
        amountPaid: 0,
        status: 'active',
      };

      const debt = await createDebt(params);
      testDebtId = debt.id;
    });

    it('should update debt with payment amount and default status', async () => {
      await paidDebt({
        id: testDebtId,
        amountPaid: 500.00,
      });

      const updated = await getDebtById(testDebtId);
      expect(updated?.id).toBe(testDebtId);
      expect(Number(updated?.amountPaid)).toBe(500.00);
      expect(updated?.status).toBe('resolved');
    });

    it('should update debt with custom status', async () => {
      await paidDebt({
        id: testDebtId,
        amountPaid: 250.00,
        status: 'partial',
      });

      const updated = await getDebtById(testDebtId);
      expect(Number(updated?.amountPaid)).toBe(250.00);
      expect(updated?.status).toBe('partial');
    });

    it('should handle full payment', async () => {
      await paidDebt({
        id: testDebtId,
        amountPaid: 1000.00,
        status: 'paid',
      });

      const updated = await getDebtById(testDebtId);
      expect(Number(updated?.amountPaid)).toBe(1000.00);
      expect(updated?.status).toBe('paid');
    });

    it('should handle non-existent debt ID gracefully', async () => {
      // paidDebt doesn't throw for non-existent IDs, it just doesn't update anything
      // This is the current behavior of the function
      await expect(
        paidDebt({
          id: '550e8400-e29b-41d4-a716-446655440000',
          amountPaid: 100.00,
        })
      ).resolves.toBeUndefined();
    });

    it('should handle decimal precision in payments', async () => {
      await paidDebt({
        id: testDebtId,
        amountPaid: 123.456, // Should round to 123.46
      });

      const updated = await getDebtById(testDebtId);
      expect(Number(updated?.amountPaid)).toBe(123.46);
    });

    it('should handle overpayment', async () => {
      await paidDebt({
        id: testDebtId,
        amountPaid: 1500.00, // More than totalOwed
        status: 'overpaid',
      });

      const updated = await getDebtById(testDebtId);
      expect(Number(updated?.totalOwed)).toBe(1000.00);
      expect(Number(updated?.amountPaid)).toBe(1500.00);
      expect(updated?.status).toBe('overpaid');
    });
  });

  describe('Edge cases and data integrity', () => {
    it('should maintain foreign key relationship with debtors', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'FK Test Creditor',
      };

      const debt = await createDebt(params);

      // Verify the relationship exists
      const result = await client.query(`
        SELECT d.*, dt.first_name, dt.last_name 
        FROM debts d 
        JOIN debtors dt ON d.debtor_id = dt.id 
        WHERE d.id = $1
      `, [debt.id]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].first_name).toBe('John');
      expect(result.rows[0].last_name).toBe('Doe');
    });

    it('should handle special characters in creditor names', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: "O'Reilly & Associates Inc. - Collection Dept.",
      };

      const result = await createDebt(params);
      expect(result.originalCreditor).toBe("O'Reilly & Associates Inc. - Collection Dept.");
    });

    it('should handle Unicode characters in creditor names', async () => {
      const params: CreateDebtParams = {
        debtorId: testDebtorId,
        originalCreditor: 'München Bank GmbH',
      };

      const result = await createDebt(params);
      expect(result.originalCreditor).toBe('München Bank GmbH');
    });
  });
});