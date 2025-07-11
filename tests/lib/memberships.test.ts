import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	activateMembership,
	type CreateMembershipParams,
	createMembership,
	deactivateMembership,
	deleteMembership,
	getActiveMembershipsByOrganizationId,
	getActiveMembershipsByUserId,
	getMembershipByUserAndOrg,
	getMembershipsByOrganizationId,
	getMembershipsByUserId,
	getUserPrimaryOrganization,
	getUserRoleInOrganization,
	isUserMemberOfOrganization,
	updateMembershipRole,
} from '@/lib/db/memberships';
import {
	type CreateOrganizationParams,
	createOrganization,
} from '@/lib/db/organizations';
import { type CreateUserParams, createUser } from '@/lib/db/users';
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

describe('Memberships Database Operations', () => {
	let testUser1Id: string;
	let testUser2Id: string;
	let testOrg1Id: string;
	let testOrg2Id: string;

	beforeEach(async () => {
		const testSetup = await createTestDb();
		testDb = testSetup.db;
		client = testSetup.client;
		await clearTables(client);

		// Create test users
		const user1Params: CreateUserParams = {
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
		};
		const user1 = await createUser(user1Params);
		testUser1Id = user1.id;

		const user2Params: CreateUserParams = {
			firstName: 'Jane',
			lastName: 'Smith',
			email: 'jane.smith@example.com',
		};
		const user2 = await createUser(user2Params);
		testUser2Id = user2.id;

		// Create test organizations
		const org1Params: CreateOrganizationParams = {
			name: 'Test Organization 1',
		};
		const org1 = await createOrganization(org1Params);
		testOrg1Id = org1.id;

		const org2Params: CreateOrganizationParams = {
			name: 'Test Organization 2',
		};
		const org2 = await createOrganization(org2Params);
		testOrg2Id = org2.id;
	});

	describe('createMembership', () => {
		it('should create membership with valid data', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'admin',
				active: true,
			};

			const result = await createMembership(membershipParams);

			expect(result.userId).toBe(testUser1Id);
			expect(result.organizationId).toBe(testOrg1Id);
			expect(result.role).toBe('admin');
			expect(result.active).toBe(true);
			expect(result.id).toBeTruthy();
			expect(result.joinedAt).toBeTruthy();
		});

		it('should create membership with default values', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			const result = await createMembership(membershipParams);

			expect(result.role).toBe('collector');
			expect(result.active).toBe(true);
		});

		it('should throw error for duplicate user-organization combination', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			await createMembership(membershipParams);
			await expect(createMembership(membershipParams)).rejects.toThrow();
		});
	});

	describe('getMembershipByUserAndOrg', () => {
		it('should return membership when found', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'admin',
			};

			const created = await createMembership(membershipParams);
			const result = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);

			expect(result?.id).toBe(created.id);
			expect(result?.role).toBe('admin');
		});

		it('should return null when membership not found', async () => {
			const result = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(result).toBeNull();
		});
	});

	describe('getMembershipsByUserId', () => {
		it('should return all memberships for user', async () => {
			const membership1Params: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			const membership2Params: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg2Id,
			};

			await createMembership(membership1Params);
			await createMembership(membership2Params);

			const result = await getMembershipsByUserId(testUser1Id);
			expect(result).toHaveLength(2);
		});

		it('should return empty array when user has no memberships', async () => {
			const result = await getMembershipsByUserId(testUser1Id);
			expect(result).toHaveLength(0);
		});
	});

	describe('getActiveMembershipsByUserId', () => {
		it('should return only active memberships', async () => {
			const membership1Params: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				active: true,
			};

			const membership2Params: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg2Id,
				active: false,
			};

			await createMembership(membership1Params);
			await createMembership(membership2Params);

			const result = await getActiveMembershipsByUserId(testUser1Id);
			expect(result).toHaveLength(1);
			expect(result[0].organizationId).toBe(testOrg1Id);
		});
	});

	describe('getMembershipsByOrganizationId', () => {
		it('should return all memberships for organization', async () => {
			const membership1Params: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			const membership2Params: CreateMembershipParams = {
				userId: testUser2Id,
				organizationId: testOrg1Id,
			};

			await createMembership(membership1Params);
			await createMembership(membership2Params);

			const result = await getMembershipsByOrganizationId(testOrg1Id);
			expect(result).toHaveLength(2);
		});
	});

	describe('getActiveMembershipsByOrganizationId', () => {
		it('should return only active memberships for organization', async () => {
			const membership1Params: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				active: true,
			};

			const membership2Params: CreateMembershipParams = {
				userId: testUser2Id,
				organizationId: testOrg1Id,
				active: false,
			};

			await createMembership(membership1Params);
			await createMembership(membership2Params);

			const result = await getActiveMembershipsByOrganizationId(testOrg1Id);
			expect(result).toHaveLength(1);
			expect(result[0].userId).toBe(testUser1Id);
		});
	});

	describe('updateMembershipRole', () => {
		it('should update membership role', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'collector',
			};

			await createMembership(membershipParams);
			const result = await updateMembershipRole(
				testUser1Id,
				testOrg1Id,
				'admin'
			);

			expect(result?.role).toBe('admin');
		});

		it('should return null when membership not found', async () => {
			const result = await updateMembershipRole(
				testUser1Id,
				testOrg1Id,
				'admin'
			);
			expect(result).toBeNull();
		});
	});

	describe('deactivateMembership and activateMembership', () => {
		it('should deactivate and reactivate membership', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			await createMembership(membershipParams);

			const deactivated = await deactivateMembership(testUser1Id, testOrg1Id);
			expect(deactivated?.active).toBe(false);

			const reactivated = await activateMembership(testUser1Id, testOrg1Id);
			expect(reactivated?.active).toBe(true);
		});
	});

	describe('deleteMembership', () => {
		it('should delete membership', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			await createMembership(membershipParams);
			await deleteMembership(testUser1Id, testOrg1Id);

			const result = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(result).toBeNull();
		});

		it('should not throw error when membership not found', async () => {
			await expect(
				deleteMembership(testUser1Id, testOrg1Id)
			).resolves.not.toThrow();
		});
	});

	describe('getUserPrimaryOrganization', () => {
		it('should return first active organization for user', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			await createMembership(membershipParams);
			const result = await getUserPrimaryOrganization(testUser1Id);

			expect(result).toBe(testOrg1Id);
		});

		it('should return null when user has no active memberships', async () => {
			const result = await getUserPrimaryOrganization(testUser1Id);
			expect(result).toBeNull();
		});
	});

	describe('isUserMemberOfOrganization', () => {
		it('should return true when user is active member', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				active: true,
			};

			await createMembership(membershipParams);
			const result = await isUserMemberOfOrganization(testUser1Id, testOrg1Id);

			expect(result).toBe(true);
		});

		it('should return false when user is inactive member', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				active: false,
			};

			await createMembership(membershipParams);
			const result = await isUserMemberOfOrganization(testUser1Id, testOrg1Id);

			expect(result).toBe(false);
		});

		it('should return false when user is not a member', async () => {
			const result = await isUserMemberOfOrganization(testUser1Id, testOrg1Id);
			expect(result).toBe(false);
		});
	});

	describe('getUserRoleInOrganization', () => {
		it('should return role when user is active member', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'admin',
				active: true,
			};

			await createMembership(membershipParams);
			const result = await getUserRoleInOrganization(testUser1Id, testOrg1Id);

			expect(result).toBe('admin');
		});

		it('should return null when user is inactive member', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'admin',
				active: false,
			};

			await createMembership(membershipParams);
			const result = await getUserRoleInOrganization(testUser1Id, testOrg1Id);

			expect(result).toBeNull();
		});

		it('should return null when user is not a member', async () => {
			const result = await getUserRoleInOrganization(testUser1Id, testOrg1Id);
			expect(result).toBeNull();
		});
	});

	describe('Edge cases and data integrity', () => {
		it('should handle various role types', async () => {
			// Test admin role
			await createMembership({
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'admin',
			});
			let result = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(result?.role).toBe('admin');
			await deleteMembership(testUser1Id, testOrg1Id);

			// Test manager role  
			await createMembership({
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'manager',
			});
			result = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(result?.role).toBe('manager');
			await deleteMembership(testUser1Id, testOrg1Id);

			// Test collector role
			await createMembership({
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'collector',
			});
			result = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(result?.role).toBe('collector');
			await deleteMembership(testUser1Id, testOrg1Id);

			// Test viewer role
			await createMembership({
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'viewer',
			});
			result = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(result?.role).toBe('viewer');
		});

		it('should maintain referential integrity', async () => {
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
			};

			const membership = await createMembership(membershipParams);
			expect(membership.userId).toBe(testUser1Id);
			expect(membership.organizationId).toBe(testOrg1Id);
		});

		it('should handle membership workflow', async () => {
			// Create membership
			const membershipParams: CreateMembershipParams = {
				userId: testUser1Id,
				organizationId: testOrg1Id,
				role: 'collector',
			};

			await createMembership(membershipParams);

			// Update role
			await updateMembershipRole(testUser1Id, testOrg1Id, 'admin');
			let membership = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(membership?.role).toBe('admin');

			// Deactivate
			await deactivateMembership(testUser1Id, testOrg1Id);
			membership = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(membership?.active).toBe(false);

			// Reactivate
			await activateMembership(testUser1Id, testOrg1Id);
			membership = await getMembershipByUserAndOrg(testUser1Id, testOrg1Id);
			expect(membership?.active).toBe(true);
		});
	});
});
