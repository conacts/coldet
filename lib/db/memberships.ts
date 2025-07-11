import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { UserOrganizationMembership } from '@/lib/db/schema';
import { userOrganizationMemberships } from '@/lib/db/schema';

export interface CreateMembershipParams {
	userId: string;
	organizationId: string;
	role?: string;
	active?: boolean;
}

export async function createMembership({
	userId,
	organizationId,
	role = 'collector',
	active = true,
}: CreateMembershipParams): Promise<UserOrganizationMembership> {
	try {
		const [membership] = await db
			.insert(userOrganizationMemberships)
			.values({
				userId,
				organizationId,
				role,
				active,
			})
			.returning();
		return membership;
	} catch (error) {
		throw error;
	}
}

export async function getMembershipByUserAndOrg(
	userId: string,
	organizationId: string
): Promise<UserOrganizationMembership | null> {
	try {
		const result = await db
			.select()
			.from(userOrganizationMemberships)
			.where(
				and(
					eq(userOrganizationMemberships.userId, userId),
					eq(userOrganizationMemberships.organizationId, organizationId)
				)
			)
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getMembershipsByUserId(userId: string): Promise<UserOrganizationMembership[]> {
	try {
		return await db
			.select()
			.from(userOrganizationMemberships)
			.where(eq(userOrganizationMemberships.userId, userId));
	} catch (error) {
		throw error;
	}
}

export async function getActiveMembershipsByUserId(userId: string): Promise<UserOrganizationMembership[]> {
	try {
		return await db
			.select()
			.from(userOrganizationMemberships)
			.where(
				and(
					eq(userOrganizationMemberships.userId, userId),
					eq(userOrganizationMemberships.active, true)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getMembershipsByOrganizationId(organizationId: string): Promise<UserOrganizationMembership[]> {
	try {
		return await db
			.select()
			.from(userOrganizationMemberships)
			.where(eq(userOrganizationMemberships.organizationId, organizationId));
	} catch (error) {
		throw error;
	}
}

export async function getActiveMembershipsByOrganizationId(organizationId: string): Promise<UserOrganizationMembership[]> {
	try {
		return await db
			.select()
			.from(userOrganizationMemberships)
			.where(
				and(
					eq(userOrganizationMemberships.organizationId, organizationId),
					eq(userOrganizationMemberships.active, true)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function updateMembershipRole(
	userId: string,
	organizationId: string,
	role: string
): Promise<UserOrganizationMembership | null> {
	try {
		const [membership] = await db
			.update(userOrganizationMemberships)
			.set({ role, updatedAt: new Date() })
			.where(
				and(
					eq(userOrganizationMemberships.userId, userId),
					eq(userOrganizationMemberships.organizationId, organizationId)
				)
			)
			.returning();
		return membership ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deactivateMembership(
	userId: string,
	organizationId: string
): Promise<UserOrganizationMembership | null> {
	try {
		const [membership] = await db
			.update(userOrganizationMemberships)
			.set({ active: false, updatedAt: new Date() })
			.where(
				and(
					eq(userOrganizationMemberships.userId, userId),
					eq(userOrganizationMemberships.organizationId, organizationId)
				)
			)
			.returning();
		return membership ?? null;
	} catch (error) {
		throw error;
	}
}

export async function activateMembership(
	userId: string,
	organizationId: string
): Promise<UserOrganizationMembership | null> {
	try {
		const [membership] = await db
			.update(userOrganizationMemberships)
			.set({ active: true, updatedAt: new Date() })
			.where(
				and(
					eq(userOrganizationMemberships.userId, userId),
					eq(userOrganizationMemberships.organizationId, organizationId)
				)
			)
			.returning();
		return membership ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deleteMembership(
	userId: string,
	organizationId: string
): Promise<void> {
	try {
		await db
			.delete(userOrganizationMemberships)
			.where(
				and(
					eq(userOrganizationMemberships.userId, userId),
					eq(userOrganizationMemberships.organizationId, organizationId)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getUserPrimaryOrganization(userId: string): Promise<string | null> {
	try {
		const memberships = await getActiveMembershipsByUserId(userId);
		// For now, return the first active membership's organization
		// Later we can add logic for user-selected primary organization
		return memberships[0]?.organizationId ?? null;
	} catch (error) {
		throw error;
	}
}

export async function isUserMemberOfOrganization(
	userId: string,
	organizationId: string
): Promise<boolean> {
	try {
		const membership = await getMembershipByUserAndOrg(userId, organizationId);
		return membership !== null && membership.active;
	} catch (error) {
		throw error;
	}
}

export async function getUserRoleInOrganization(
	userId: string,
	organizationId: string
): Promise<string | null> {
	try {
		const membership = await getMembershipByUserAndOrg(userId, organizationId);
		return membership?.active ? membership.role : null;
	} catch (error) {
		throw error;
	}
}