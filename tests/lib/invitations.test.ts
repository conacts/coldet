import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { 
  createInvitation,
  getInvitationByToken,
  getInvitationsByOrganizationId,
  getPendingInvitationsByOrganizationId,
  getInvitationsByEmail,
  getPendingInvitationsByEmail,
  useInvitation,
  isInvitationValid,
  getValidInvitation,
  expireInvitation,
  deleteInvitation,
  cleanupExpiredInvitations,
  resendInvitation,
  buildInvitationUrl,
  type CreateInvitationParams
} from '@/lib/db/invitations';
import { createUser, type CreateUserParams } from '@/lib/db/users';
import { createOrganization, type CreateOrganizationParams } from '@/lib/db/organizations';

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

describe('Invitations Database Operations', () => {
  let testUserId: string;
  let testOrganizationId: string;

  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);

    // Create test user
    const userParams: CreateUserParams = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
    };
    const user = await createUser(userParams);
    testUserId = user.id;

    // Create test organization
    const orgParams: CreateOrganizationParams = {
      name: 'Test Organization',
    };
    const org = await createOrganization(orgParams);
    testOrganizationId = org.id;
  });

  describe('createInvitation', () => {
    it('should create invitation with valid data', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
        role: 'collector',
        expiresInDays: 7,
      };

      const result = await createInvitation(invitationParams);

      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.invitedByUserId).toBe(testUserId);
      expect(result.email).toBe('invited@example.com');
      expect(result.role).toBe('collector');
      expect(result.token).toBeTruthy();
      expect(result.used).toBe(false);
      expect(result.expiresAt).toBeTruthy();
      expect(result.id).toBeTruthy();
    });

    it('should create invitation with default values', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const result = await createInvitation(invitationParams);

      expect(result.role).toBe('collector');
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate unique tokens', async () => {
      const invitationParams1: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited1@example.com',
      };

      const invitationParams2: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited2@example.com',
      };

      const result1 = await createInvitation(invitationParams1);
      const result2 = await createInvitation(invitationParams2);

      expect(result1.token).not.toBe(result2.token);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation when found', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const created = await createInvitation(invitationParams);
      const result = await getInvitationByToken(created.token);

      expect(result?.id).toBe(created.id);
      expect(result?.email).toBe('invited@example.com');
    });

    it('should return null when invitation not found', async () => {
      const result = await getInvitationByToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('getInvitationsByOrganizationId', () => {
    it('should return all invitations for organization', async () => {
      const invitation1Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited1@example.com',
      };

      const invitation2Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited2@example.com',
      };

      await createInvitation(invitation1Params);
      await createInvitation(invitation2Params);

      const result = await getInvitationsByOrganizationId(testOrganizationId);
      expect(result).toHaveLength(2);
    });
  });

  describe('getPendingInvitationsByOrganizationId', () => {
    it('should return only unused invitations', async () => {
      const invitation1Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited1@example.com',
      };

      const invitation2Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited2@example.com',
      };

      const invitation1 = await createInvitation(invitation1Params);
      await createInvitation(invitation2Params);

      // Use first invitation
      await useInvitation(invitation1.token, testUserId);

      const result = await getPendingInvitationsByOrganizationId(testOrganizationId);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('invited2@example.com');
    });
  });

  describe('getInvitationsByEmail', () => {
    it('should return all invitations for email', async () => {
      const invitation1Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const invitation2Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      await createInvitation(invitation1Params);
      await createInvitation(invitation2Params);

      const result = await getInvitationsByEmail('invited@example.com');
      expect(result).toHaveLength(2);
    });
  });

  describe('getPendingInvitationsByEmail', () => {
    it('should return only unused invitations for email', async () => {
      const invitation1Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const invitation2Params: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const invitation1 = await createInvitation(invitation1Params);
      await createInvitation(invitation2Params);

      // Use first invitation
      await useInvitation(invitation1.token, testUserId);

      const result = await getPendingInvitationsByEmail('invited@example.com');
      expect(result).toHaveLength(1);
    });
  });

  describe('useInvitation', () => {
    it('should mark invitation as used', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const created = await createInvitation(invitationParams);
      const result = await useInvitation(created.token, testUserId);

      expect(result?.used).toBe(true);
      expect(result?.usedAt).toBeTruthy();
      expect(result?.usedByUserId).toBe(testUserId);
    });

    it('should return null when invitation not found', async () => {
      const result = await useInvitation('invalid-token', testUserId);
      expect(result).toBeNull();
    });
  });

  describe('isInvitationValid', () => {
    it('should return true for valid invitation', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
        expiresInDays: 7,
      };

      const created = await createInvitation(invitationParams);
      const result = await isInvitationValid(created.token);

      expect(result).toBe(true);
    });

    it('should return false for used invitation', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const created = await createInvitation(invitationParams);
      await useInvitation(created.token, testUserId);
      const result = await isInvitationValid(created.token);

      expect(result).toBe(false);
    });

    it('should return false for expired invitation', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
        expiresInDays: -1, // Already expired
      };

      const created = await createInvitation(invitationParams);
      const result = await isInvitationValid(created.token);

      expect(result).toBe(false);
    });

    it('should return false for non-existent invitation', async () => {
      const result = await isInvitationValid('invalid-token');
      expect(result).toBe(false);
    });
  });

  describe('getValidInvitation', () => {
    it('should return invitation when valid', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const created = await createInvitation(invitationParams);
      const result = await getValidInvitation(created.token);

      expect(result?.id).toBe(created.id);
    });

    it('should return null when invitation is used', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const created = await createInvitation(invitationParams);
      await useInvitation(created.token, testUserId);
      const result = await getValidInvitation(created.token);

      expect(result).toBeNull();
    });

    it('should return null when invitation is expired', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
        expiresInDays: -1,
      };

      const created = await createInvitation(invitationParams);
      const result = await getValidInvitation(created.token);

      expect(result).toBeNull();
    });
  });

  describe('expireInvitation', () => {
    it('should expire invitation', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const created = await createInvitation(invitationParams);
      const result = await expireInvitation(created.token);

      expect(result?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('deleteInvitation', () => {
    it('should delete invitation', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const created = await createInvitation(invitationParams);
      await deleteInvitation(created.token);

      const result = await getInvitationByToken(created.token);
      expect(result).toBeNull();
    });

    it('should not throw error when invitation not found', async () => {
      await expect(deleteInvitation('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should delete expired invitations', async () => {
      const expiredInvitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'expired@example.com',
        expiresInDays: -1,
      };

      const validInvitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'valid@example.com',
        expiresInDays: 7,
      };

      await createInvitation(expiredInvitationParams);
      await createInvitation(validInvitationParams);

      const deletedCount = await cleanupExpiredInvitations();
      expect(deletedCount).toBe(1);

      const remaining = await getInvitationsByOrganizationId(testOrganizationId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].email).toBe('valid@example.com');
    });
  });

  describe('resendInvitation', () => {
    it('should extend invitation expiry', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
        expiresInDays: 1,
      };

      const created = await createInvitation(invitationParams);
      const originalExpiry = created.expiresAt;

      const result = await resendInvitation(created.token, 14);
      expect(result?.expiresAt.getTime()).toBeGreaterThan(originalExpiry.getTime());
    });
  });

  describe('buildInvitationUrl', () => {
    it('should build correct invitation URL with default base URL', async () => {
      const token = 'test-token-123';
      const url = buildInvitationUrl(token);
      expect(url).toBe('https://app.coldets.com/invite/test-token-123');
    });

    it('should build correct invitation URL with custom base URL', async () => {
      const token = 'test-token-123';
      const url = buildInvitationUrl(token, 'https://custom.example.com');
      expect(url).toBe('https://custom.example.com/invite/test-token-123');
    });
  });

  describe('Edge cases and data integrity', () => {
    it('should handle various roles', async () => {
      const roles = ['admin', 'manager', 'collector', 'viewer'];
      
      for (const role of roles) {
        const invitationParams: CreateInvitationParams = {
          organizationId: testOrganizationId,
          invitedByUserId: testUserId,
          email: `${role}@example.com`,
          role,
        };

        const result = await createInvitation(invitationParams);
        expect(result.role).toBe(role);
      }
    });

    it('should handle special characters in email', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'user+test@example-domain.co.uk',
      };

      const result = await createInvitation(invitationParams);
      expect(result.email).toBe('user+test@example-domain.co.uk');
    });

    it('should generate secure tokens', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'invited@example.com',
      };

      const result = await createInvitation(invitationParams);
      
      // Token should be 64 characters (32 bytes hex)
      expect(result.token).toHaveLength(64);
      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle complete invitation lifecycle', async () => {
      const invitationParams: CreateInvitationParams = {
        organizationId: testOrganizationId,
        invitedByUserId: testUserId,
        email: 'lifecycle@example.com',
        role: 'admin',
      };

      // Create invitation
      const created = await createInvitation(invitationParams);
      expect(created.used).toBe(false);
      expect(await isInvitationValid(created.token)).toBe(true);

      // Check it's in pending lists
      const pendingByOrg = await getPendingInvitationsByOrganizationId(testOrganizationId);
      expect(pendingByOrg.some(inv => inv.id === created.id)).toBe(true);

      const pendingByEmail = await getPendingInvitationsByEmail('lifecycle@example.com');
      expect(pendingByEmail.some(inv => inv.id === created.id)).toBe(true);

      // Use invitation
      await useInvitation(created.token, testUserId);
      expect(await isInvitationValid(created.token)).toBe(false);

      // Check it's no longer in pending lists
      const pendingAfterUse = await getPendingInvitationsByOrganizationId(testOrganizationId);
      expect(pendingAfterUse.some(inv => inv.id === created.id)).toBe(false);
    });
  });
});