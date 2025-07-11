import { eq, and, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { OrganizationInvitation } from '@/lib/db/schema';
import { organizationInvitations } from '@/lib/db/schema';
import { randomBytes } from 'node:crypto';

export interface CreateInvitationParams {
	organizationId: string;
	invitedByUserId: string;
	email: string;
	role?: string;
	expiresInDays?: number;
}

export async function createInvitation({
	organizationId,
	invitedByUserId,
	email,
	role = 'collector',
	expiresInDays = 7,
}: CreateInvitationParams): Promise<OrganizationInvitation> {
	try {
		const token = generateInvitationToken();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + expiresInDays);

		const [invitation] = await db
			.insert(organizationInvitations)
			.values({
				organizationId,
				invitedByUserId,
				email,
				role,
				token,
				expiresAt,
			})
			.returning();
		return invitation;
	} catch (error) {
		throw error;
	}
}

export async function getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
	try {
		const result = await db
			.select()
			.from(organizationInvitations)
			.where(eq(organizationInvitations.token, token))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getInvitationsByOrganizationId(organizationId: string): Promise<OrganizationInvitation[]> {
	try {
		return await db
			.select()
			.from(organizationInvitations)
			.where(eq(organizationInvitations.organizationId, organizationId));
	} catch (error) {
		throw error;
	}
}

export async function getPendingInvitationsByOrganizationId(organizationId: string): Promise<OrganizationInvitation[]> {
	try {
		return await db
			.select()
			.from(organizationInvitations)
			.where(
				and(
					eq(organizationInvitations.organizationId, organizationId),
					eq(organizationInvitations.used, false)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getInvitationsByEmail(email: string): Promise<OrganizationInvitation[]> {
	try {
		return await db
			.select()
			.from(organizationInvitations)
			.where(eq(organizationInvitations.email, email));
	} catch (error) {
		throw error;
	}
}

export async function getPendingInvitationsByEmail(email: string): Promise<OrganizationInvitation[]> {
	try {
		return await db
			.select()
			.from(organizationInvitations)
			.where(
				and(
					eq(organizationInvitations.email, email),
					eq(organizationInvitations.used, false)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function useInvitation(
	token: string,
	usedByUserId: string
): Promise<OrganizationInvitation | null> {
	try {
		const [invitation] = await db
			.update(organizationInvitations)
			.set({
				used: true,
				usedAt: new Date(),
				usedByUserId,
				updatedAt: new Date(),
			})
			.where(eq(organizationInvitations.token, token))
			.returning();
		return invitation ?? null;
	} catch (error) {
		throw error;
	}
}

export async function isInvitationValid(token: string): Promise<boolean> {
	try {
		const invitation = await getInvitationByToken(token);
		if (!invitation) {
			return false;
		}
		
		const now = new Date();
		return (
			!invitation.used && 
			invitation.expiresAt.getTime() > now.getTime()
		);
	} catch (error) {
		throw error;
	}
}

export async function getValidInvitation(token: string): Promise<OrganizationInvitation | null> {
	try {
		const invitation = await getInvitationByToken(token);
		if (!invitation) {
			return null;
		}
		
		const now = new Date();
		if (invitation.used || invitation.expiresAt.getTime() <= now.getTime()) {
			return null;
		}
		
		return invitation;
	} catch (error) {
		throw error;
	}
}

export async function expireInvitation(token: string): Promise<OrganizationInvitation | null> {
	try {
		const [invitation] = await db
			.update(organizationInvitations)
			.set({
				expiresAt: new Date(), // Set to now to expire it
				updatedAt: new Date(),
			})
			.where(eq(organizationInvitations.token, token))
			.returning();
		return invitation ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deleteInvitation(token: string): Promise<void> {
	try {
		await db
			.delete(organizationInvitations)
			.where(eq(organizationInvitations.token, token));
	} catch (error) {
		throw error;
	}
}

export async function cleanupExpiredInvitations(): Promise<number> {
	try {
		const now = new Date();
		
		// First get the count of expired invitations
		const expiredInvitations = await db
			.select({ id: organizationInvitations.id })
			.from(organizationInvitations)
			.where(
				and(
					eq(organizationInvitations.used, false),
					lt(organizationInvitations.expiresAt, now)
				)
			);
		
		const count = expiredInvitations.length;
		
		// Then delete them
		if (count > 0) {
			await db
				.delete(organizationInvitations)
				.where(
					and(
						eq(organizationInvitations.used, false),
						lt(organizationInvitations.expiresAt, now)
					)
				);
		}
		
		return count;
	} catch (error) {
		throw error;
	}
}

export async function resendInvitation(
	token: string,
	expiresInDays: number = 7
): Promise<OrganizationInvitation | null> {
	try {
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + expiresInDays);

		const [invitation] = await db
			.update(organizationInvitations)
			.set({
				expiresAt,
				updatedAt: new Date(),
			})
			.where(eq(organizationInvitations.token, token))
			.returning();
		return invitation ?? null;
	} catch (error) {
		throw error;
	}
}

function generateInvitationToken(): string {
	return randomBytes(32).toString('hex');
}

export function buildInvitationUrl(token: string, baseUrl: string = 'https://app.coldets.com'): string {
	return `${baseUrl}/invite/${token}`;
}