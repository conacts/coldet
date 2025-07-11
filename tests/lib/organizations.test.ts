import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, clearTables } from '../setup-db';
import { 
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deactivateOrganization,
  activateOrganization,
  deleteOrganization,
  getActiveOrganizations,
  getAllOrganizations,
  updateOrganizationSettings,
  type CreateOrganizationParams
} from '@/lib/db/organizations';

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

describe('Organizations Database Operations', () => {
  beforeEach(async () => {
    const testSetup = await createTestDb();
    testDb = testSetup.db;
    client = testSetup.client;
    await clearTables(client);
  });

  describe('createOrganization', () => {
    it('should create organization with valid data', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Test Organization',
        description: 'A test organization for debt collection',
        settings: { theme: 'dark', notifications: true },
        active: true,
      };

      const result = await createOrganization(orgParams);

      expect(result.name).toBe('Test Organization');
      expect(result.description).toBe('A test organization for debt collection');
      expect(result.settings).toEqual({ theme: 'dark', notifications: true });
      expect(result.active).toBe(true);
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it('should create organization with minimal required data', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Minimal Org',
      };

      const result = await createOrganization(orgParams);

      expect(result.name).toBe('Minimal Org');
      expect(result.description).toBeNull();
      expect(result.settings).toBeNull();
      expect(result.active).toBe(true);
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization when found', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Test Organization',
        description: 'Test description',
      };

      const created = await createOrganization(orgParams);
      const result = await getOrganizationById(created.id);

      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe('Test Organization');
    });

    it('should return null when organization not found', async () => {
      const result = await getOrganizationById('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });
  });

  describe('updateOrganization', () => {
    it('should update organization fields', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Original Name',
        description: 'Original description',
      };

      const created = await createOrganization(orgParams);
      const result = await updateOrganization(created.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(result?.name).toBe('Updated Name');
      expect(result?.description).toBe('Updated description');
    });

    it('should return null when organization not found', async () => {
      const result = await updateOrganization('550e8400-e29b-41d4-a716-446655440000', {
        name: 'Test',
      });
      expect(result).toBeNull();
    });
  });

  describe('deactivateOrganization and activateOrganization', () => {
    it('should deactivate and reactivate organization', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Test Organization',
      };

      const created = await createOrganization(orgParams);
      expect(created.active).toBe(true);

      const deactivated = await deactivateOrganization(created.id);
      expect(deactivated?.active).toBe(false);

      const reactivated = await activateOrganization(created.id);
      expect(reactivated?.active).toBe(true);
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Test Organization',
      };

      const created = await createOrganization(orgParams);
      await deleteOrganization(created.id);

      const result = await getOrganizationById(created.id);
      expect(result).toBeNull();
    });

    it('should not throw error when organization not found', async () => {
      await expect(deleteOrganization('550e8400-e29b-41d4-a716-446655440000')).resolves.not.toThrow();
    });
  });

  describe('getActiveOrganizations', () => {
    it('should return only active organizations', async () => {
      const org1Params: CreateOrganizationParams = {
        name: 'Active Organization',
      };

      const org2Params: CreateOrganizationParams = {
        name: 'Inactive Organization',
        active: false,
      };

      const activeOrg = await createOrganization(org1Params);
      await createOrganization(org2Params);

      const result = await getActiveOrganizations();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(activeOrg.id);
    });
  });

  describe('getAllOrganizations', () => {
    it('should return all organizations', async () => {
      const org1Params: CreateOrganizationParams = {
        name: 'Organization 1',
      };

      const org2Params: CreateOrganizationParams = {
        name: 'Organization 2',
        active: false,
      };

      await createOrganization(org1Params);
      await createOrganization(org2Params);

      const result = await getAllOrganizations();
      expect(result).toHaveLength(2);
    });
  });

  describe('updateOrganizationSettings', () => {
    it('should update organization settings', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Test Organization',
        settings: { theme: 'light' },
      };

      const created = await createOrganization(orgParams);
      const newSettings = { theme: 'dark', notifications: true };
      const result = await updateOrganizationSettings(created.id, newSettings);

      expect(result?.settings).toEqual(newSettings);
    });
  });

  describe('Edge cases and data integrity', () => {
    it('should handle special characters in name', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Organization with "Special" Characters & Symbols',
        description: 'An organization that handles special cases & edge scenarios.',
      };

      const result = await createOrganization(orgParams);
      expect(result.name).toBe('Organization with "Special" Characters & Symbols');
      expect(result.description).toBe('An organization that handles special cases & edge scenarios.');
    });

    it('should handle Unicode characters', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'Organización Internacional 🌍',
        description: 'Una organización que maneja casos internacionales.',
      };

      const result = await createOrganization(orgParams);
      expect(result.name).toBe('Organización Internacional 🌍');
      expect(result.description).toBe('Una organización que maneja casos internacionales.');
    });

    it('should handle complex JSON settings', async () => {
      const complexSettings = {
        theme: 'dark',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        billing: {
          plan: 'premium',
          maxUsers: 50,
        },
        features: ['ai_collectors', 'bulk_upload', 'analytics'],
      };

      const orgParams: CreateOrganizationParams = {
        name: 'Complex Settings Organization',
        settings: complexSettings,
      };

      const result = await createOrganization(orgParams);
      expect(result.settings).toEqual(complexSettings);
    });

    it('should generate valid UUIDs', async () => {
      const orgParams: CreateOrganizationParams = {
        name: 'UUID Test Organization',
      };

      const result = await createOrganization(orgParams);
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });
});