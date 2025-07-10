import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { 
  createDebtor, 
  getDebtorById, 
  getDebtorByEmail, 
  updateCurrentlyCollecting,
  type CreateDebtorParams 
} from '@/lib/db/debtors';

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

describe('Debtors Database Operations', () => {
  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);
  });

  describe('createDebtor', () => {
    it('should create debtor with valid data', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        addressLine1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
      };

      const result = await createDebtor(params);

      expect(result).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        addressLine1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        phoneConsent: false,
        emailConsent: true,
        dncRegistered: false,
        currentlyCollecting: false,
      });
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it('should create debtor with minimal required data', async () => {
      const params: CreateDebtorParams = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = await createDebtor(params);

      expect(result).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
        email: null,
        phone: null,
        phoneConsent: false,
        emailConsent: true,
        dncRegistered: false,
        currentlyCollecting: false,
      });
    });

    it('should handle custom consent values', async () => {
      const params: CreateDebtorParams = {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        phoneConsent: true,
        emailConsent: false,
        dncRegistered: true,
        currentlyCollecting: true,
      };

      const result = await createDebtor(params);

      expect(result).toMatchObject({
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        phoneConsent: true,
        emailConsent: false,
        dncRegistered: true,
        currentlyCollecting: true,
      });
    });

    it('should handle duplicate email addresses', async () => {
      const params1: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'duplicate@example.com',
      };

      const params2: CreateDebtorParams = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'duplicate@example.com',
      };

      await createDebtor(params1);

      await expect(createDebtor(params2)).rejects.toThrow();
    });

    it('should handle address fields correctly', async () => {
      const params: CreateDebtorParams = {
        firstName: 'Alice',
        lastName: 'Cooper',
        addressLine1: '456 Oak Ave',
        addressLine2: 'Apt 2B',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
      };

      const result = await createDebtor(params);

      expect(result).toMatchObject({
        addressLine1: '456 Oak Ave',
        addressLine2: 'Apt 2B',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
      });
    });
  });

  describe('getDebtorById', () => {
    it('should return debtor when found', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const created = await createDebtor(params);
      const result = await getDebtorById(created.id);

      expect(result).toMatchObject({
        id: created.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should return null when debtor not found', async () => {
      const result = await getDebtorById('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });
  });

  describe('getDebtorByEmail', () => {
    it('should return debtor when found by email', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const created = await createDebtor(params);
      const result = await getDebtorByEmail('john@example.com');

      expect(result).toMatchObject({
        id: created.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should return null when email not found', async () => {
      const result = await getDebtorByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });

    it('should handle empty string email', async () => {
      const result = await getDebtorByEmail('');
      expect(result).toBeNull();
    });

    it('should handle debtor with null email', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: undefined, // This will be null in the database
      };

      await createDebtor(params);
      const result = await getDebtorByEmail('john@example.com');
      expect(result).toBeNull();
    });
  });

  describe('updateCurrentlyCollecting', () => {
    it('should update currently collecting status to true', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        currentlyCollecting: false,
      };

      const created = await createDebtor(params);
      const result = await updateCurrentlyCollecting(created.id, true);

      expect(result).toMatchObject({
        id: created.id,
        firstName: 'John',
        lastName: 'Doe',
        currentlyCollecting: true,
      });
      expect(result.updatedAt).not.toEqual(created.updatedAt);
    });

    it('should update currently collecting status to false', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        currentlyCollecting: true,
      };

      const created = await createDebtor(params);
      const result = await updateCurrentlyCollecting(created.id, false);

      expect(result).toMatchObject({
        id: created.id,
        currentlyCollecting: false,
      });
    });

    it('should throw error when debtor not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      await expect(
        updateCurrentlyCollecting(fakeId, true)
      ).rejects.toThrow(`Debtor not found with ID: ${fakeId}`);
    });

    it('should update timestamp when updating', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
        currentlyCollecting: false,
      };

      const created = await createDebtor(params);
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await updateCurrentlyCollecting(created.id, true);
      
      expect(new Date(result.updatedAt!).getTime()).toBeGreaterThan(
        new Date(created.updatedAt!).getTime()
      );
    });
  });

  describe('Database constraints and validation', () => {
    it('should handle special characters in names', async () => {
      const params: CreateDebtorParams = {
        firstName: "John-Paul O'Connor",
        lastName: 'Müller-Schmidt',
        email: 'john.paul@example.com',
      };

      const result = await createDebtor(params);
      expect(result.firstName).toBe("John-Paul O'Connor");
      expect(result.lastName).toBe('Müller-Schmidt');
    });

    it('should handle international characters', async () => {
      const params: CreateDebtorParams = {
        firstName: '张',
        lastName: '三',
        email: 'zhang.san@example.com',
      };

      const result = await createDebtor(params);
      expect(result.firstName).toBe('张');
      expect(result.lastName).toBe('三');
    });

    it('should generate valid UUIDs', async () => {
      const params: CreateDebtorParams = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await createDebtor(params);
      
      // UUID v4 regex pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.id).toMatch(uuidPattern);
    });
  });
});