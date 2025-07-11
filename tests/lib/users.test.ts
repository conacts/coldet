import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateUser,
  type CreateUserParams,
  createUser,
  deactivateUser,
  deleteUser,
  getActiveUsers,
  getUserByEmail,
  getUserById,
  updateUser,
  updateUserLastLogin,
  updateUserPassword,
  verifyUserEmail,
} from '@/lib/db/users';
import { clearTables, createTestDb } from '../setup-db';

// Mock the db import to use our test database
let testDb: Awaited<ReturnType<typeof createTestDb>>['db'];
let client: PGlite;

vi.mock('@/lib/db/client', () => ({
  db: new Proxy(
    {},
    {
      get: (_target, prop) => {
        return testDb[prop as keyof typeof testDb];
      },
    }
  ),
}));

describe('Users Database Operations', () => {
  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        password: 'hashed_password_123',
        emailVerified: true,
        active: true,
      };

      const result = await createUser(userParams);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('555-1234');
      expect(result.hashedPassword).toBeDefined();
      expect(result.emailVerified).toBe(true);
      expect(result.active).toBe(true);
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it('should create user with minimal required data', async () => {
      const userParams: CreateUserParams = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'hashed_password_123',
      };

      const result = await createUser(userParams);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('jane.smith@example.com');
      expect(result.phone).toBeNull();
      expect(result.hashedPassword).toBeDefined();
      expect(result.emailVerified).toBe(false);
      expect(result.active).toBe(true);
    });

    it('should handle duplicate email addresses', async () => {
      const userParams1: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'duplicate@example.com',
        password: 'hashed_password_123',
      };

      const userParams2: CreateUserParams = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'duplicate@example.com',
        password: 'hashed_password_123',
      };

      await createUser(userParams1);
      await expect(createUser(userParams2)).rejects.toThrow();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'hashed_password_123',
      };

      const created = await createUser(userParams);
      const result = await getUserById(created.id);

      expect(result?.id).toBe(created.id);
      expect(result?.email).toBe('john.doe@example.com');
    });

    it('should return null when user not found', async () => {
      const result = await getUserById('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
		password: 'hashed_password_123',
      };

      const created = await createUser(userParams);
      const result = await getUserByEmail('john.doe@example.com');

      expect(result?.id).toBe(created.id);
      expect(result?.email).toBe('john.doe@example.com');
    });

    it('should return null when email not found', async () => {
      const result = await getUserByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
		password: 'hashed_password_123',
      };

      const created = await createUser(userParams);
      const result = await updateUser(created.id, {
        firstName: 'Johnny',
        phone: '555-9999',
      });

      expect(result?.firstName).toBe('Johnny');
      expect(result?.phone).toBe('555-9999');
      expect(result?.lastName).toBe('Doe'); // Should remain unchanged
    });

    it('should return null when user not found', async () => {
      const result = await updateUser('550e8400-e29b-41d4-a716-446655440000', {
        firstName: 'Test',
      });
      expect(result).toBeNull();
    });
  });

  describe('updateUserLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
		password: 'hashed_password_123',
      };

      const created = await createUser(userParams);
      expect(created.lastLoginAt).toBeNull();

      const result = await updateUserLastLogin(created.id);
      expect(result?.lastLoginAt).toBeTruthy();
    });
  });

  describe('deactivateUser and activateUser', () => {
    it('should deactivate and reactivate user', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
		password: 'hashed_password_123',
      };

      const created = await createUser(userParams);
      expect(created.active).toBe(true);

      const deactivated = await deactivateUser(created.id);
      expect(deactivated?.active).toBe(false);

      const reactivated = await activateUser(created.id);
      expect(reactivated?.active).toBe(true);
    });
  });

  describe('getActiveUsers', () => {
    it('should return only active users', async () => {
      const user1Params: CreateUserParams = {
        firstName: 'Active',
        lastName: 'User',
        email: 'active@example.com',
		password: 'hashed_password_123',
      };

      const user2Params: CreateUserParams = {
        firstName: 'Inactive',
        lastName: 'User',
        email: 'inactive@example.com',
		password: 'hashed_password_123',
      };

      const activeUser = await createUser(user1Params);
      const inactiveUser = await createUser(user2Params);
      await deactivateUser(inactiveUser.id);

      const result = await getActiveUsers();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(activeUser.id);
    });
  });

  describe('verifyUserEmail', () => {
    it('should verify user email', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        emailVerified: false,
		password: 'hashed_password_123',
      };

      const created = await createUser(userParams);
      expect(created.emailVerified).toBe(false);

      const result = await verifyUserEmail(created.id);
      expect(result?.emailVerified).toBe(true);
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'old_password',
		emailVerified: true,
		active: true,
      };

      const created = await createUser(userParams);
      const result = await updateUserPassword(
        created.id,
        'new_hashed_password'
      );

      expect(result?.hashedPassword).toBe('new_hashed_password');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
		password: 'hashed_password_123',
      };

      const created = await createUser(userParams);
      await deleteUser(created.id);

      const result = await getUserById(created.id);
      expect(result).toBeNull();
    });

    it('should not throw error when user not found', async () => {
      await expect(
        deleteUser('550e8400-e29b-41d4-a716-446655440000')
      ).resolves.not.toThrow();
    });
  });

  describe('Data validation', () => {
    it('should handle special characters in names', async () => {
      const userParams: CreateUserParams = {
        firstName: "John-Paul O'Connor",
        lastName: 'Müller-Schmidt',
        email: 'john.paul@example.com',
		password: 'hashed_password_123',
      };

      const result = await createUser(userParams);
      expect(result.firstName).toBe("John-Paul O'Connor");
      expect(result.lastName).toBe('Müller-Schmidt');
    });

    it('should handle international characters', async () => {
      const userParams: CreateUserParams = {
        firstName: '张',
        lastName: '三',
        email: 'zhang.san@example.com',
		password: 'hashed_password_123',
      };

      const result = await createUser(userParams);
      expect(result.firstName).toBe('张');
      expect(result.lastName).toBe('三');
    });

    it('should generate valid UUIDs', async () => {
      const userParams: CreateUserParams = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
		password: 'hashed_password_123',
    };

      const result = await createUser(userParams);
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
