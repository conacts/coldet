import { and, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { type Debtor, debtors } from '@/lib/db/schema';

export interface CreateDebtorParams {
	organizationId: string;
	createdByUserId: string;
	firstName: string;
	lastName: string;
	email?: string | null;
	phone?: string | null;
	addressLine1?: string | null;
	addressLine2?: string | null;
	city?: string | null;
	state?: string | null;
	zipCode?: string | null;
	phoneConsent?: boolean;
	emailConsent?: boolean;
	dncRegistered?: boolean;
	currentlyCollecting?: boolean;
	visibility?: 'private' | 'public';
}

export async function createDebtor({
	organizationId,
	createdByUserId,
	firstName,
	lastName,
	email,
	phone,
	addressLine1,
	addressLine2,
	city,
	state,
	zipCode,
	phoneConsent = false,
	emailConsent = true,
	dncRegistered = false,
	currentlyCollecting = false,
	visibility = 'private',
}: CreateDebtorParams): Promise<Debtor> {
	try {
		const [debtor] = await db
			.insert(debtors)
			.values({
				organizationId,
				createdByUserId,
				firstName,
				lastName,
				email,
				phone,
				addressLine1,
				addressLine2,
				city,
				state,
				zipCode,
				phoneConsent,
				emailConsent,
				dncRegistered,
				currentlyCollecting,
				visibility,
			})
			.returning();
		return debtor;
	} catch (error) {
		throw error;
	}
}

export async function getDebtorById(id: string): Promise<Debtor | null> {
	try {
		const result = await db
			.select()
			.from(debtors)
			.where(eq(debtors.id, id))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getDebtorByEmail(email: string): Promise<Debtor | null> {
	try {
		const result = await db
			.select()
			.from(debtors)
			.where(eq(debtors.email, email))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getDebtorsByOrganizationId(
	organizationId: string
): Promise<Debtor[]> {
	try {
		return await db
			.select()
			.from(debtors)
			.where(eq(debtors.organizationId, organizationId));
	} catch (error) {
		throw error;
	}
}

export async function getAccessibleDebtors(
	organizationId: string,
	userId: string,
	userRole: string
): Promise<Debtor[]> {
	try {
		// Admins can see all debtors in the organization
		if (userRole === 'admin') {
			return await getDebtorsByOrganizationId(organizationId);
		}

		// Non-admins can see public debtors + their own private debtors
		return await db
			.select()
			.from(debtors)
			.where(
				and(
					eq(debtors.organizationId, organizationId),
					or(
						eq(debtors.visibility, 'public'),
						eq(debtors.createdByUserId, userId)
					)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getDebtorsByUserId(
	organizationId: string,
	userId: string
): Promise<Debtor[]> {
	try {
		return await db
			.select()
			.from(debtors)
			.where(
				and(
					eq(debtors.organizationId, organizationId),
					eq(debtors.createdByUserId, userId)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getPublicDebtors(
	organizationId: string
): Promise<Debtor[]> {
	try {
		return await db
			.select()
			.from(debtors)
			.where(
				and(
					eq(debtors.organizationId, organizationId),
					eq(debtors.visibility, 'public')
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getPrivateDebtors(
	organizationId: string,
	userId: string
): Promise<Debtor[]> {
	try {
		return await db
			.select()
			.from(debtors)
			.where(
				and(
					eq(debtors.organizationId, organizationId),
					eq(debtors.createdByUserId, userId),
					eq(debtors.visibility, 'private')
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function updateDebtor(
	id: string,
	updates: Partial<
		Omit<Debtor, 'id' | 'organizationId' | 'createdByUserId' | 'createdAt'>
	>
): Promise<Debtor | null> {
	try {
		const [debtor] = await db
			.update(debtors)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(debtors.id, id))
			.returning();
		return debtor ?? null;
	} catch (error) {
		throw error;
	}
}

export async function updateCurrentlyCollecting(
	id: string,
	currentlyCollecting: boolean
): Promise<Debtor | null> {
	try {
		const [debtor] = await db
			.update(debtors)
			.set({ currentlyCollecting, updatedAt: new Date() })
			.where(eq(debtors.id, id))
			.returning();

		if (!debtor) {
			throw new Error(`Debtor not found with ID: ${id}`);
		}

		return debtor;
	} catch (error) {
		throw error;
	}
}

export async function updateDebtorVisibility(
	id: string,
	visibility: 'private' | 'public'
): Promise<Debtor | null> {
	try {
		const [debtor] = await db
			.update(debtors)
			.set({ visibility, updatedAt: new Date() })
			.where(eq(debtors.id, id))
			.returning();
		return debtor ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deleteDebtor(id: string): Promise<void> {
	try {
		await db.delete(debtors).where(eq(debtors.id, id));
	} catch (error) {
		throw error;
	}
}

export async function canUserAccessDebtor(
	debtorId: string,
	userId: string,
	userRole: string
): Promise<boolean> {
	try {
		const debtor = await getDebtorById(debtorId);
		if (!debtor) {
			return false;
		}

		// Admins can access all debtors in their organization
		if (userRole === 'admin') {
			return true;
		}

		// Users can access public debtors or their own private debtors
		return debtor.visibility === 'public' || debtor.createdByUserId === userId;
	} catch (error) {
		throw error;
	}
}

export async function canUserModifyDebtor(
	debtorId: string,
	userId: string,
	userRole: string
): Promise<boolean> {
	try {
		const debtor = await getDebtorById(debtorId);
		if (!debtor) {
			return false;
		}

		// Admins can modify all debtors in their organization
		if (userRole === 'admin') {
			return true;
		}

		// Users can only modify their own debtors
		return debtor.createdByUserId === userId;
	} catch (error) {
		throw error;
	}
}

export async function bulkCreateDebtors(
	debtors: CreateDebtorParams[]
): Promise<Debtor[]> {
	try {
		const result = await db
			.insert(debtors)
			.values(
				debtors.map((debtor) => ({
					organizationId: debtor.organizationId,
					createdByUserId: debtor.createdByUserId,
					firstName: debtor.firstName,
					lastName: debtor.lastName,
					email: debtor.email,
					phone: debtor.phone,
					addressLine1: debtor.addressLine1,
					addressLine2: debtor.addressLine2,
					city: debtor.city,
					state: debtor.state,
					zipCode: debtor.zipCode,
					phoneConsent: debtor.phoneConsent ?? false,
					emailConsent: debtor.emailConsent ?? true,
					dncRegistered: debtor.dncRegistered ?? false,
					currentlyCollecting: debtor.currentlyCollecting ?? false,
					visibility: debtor.visibility ?? 'private',
				}))
			)
			.returning();
		return result;
	} catch (error) {
		throw error;
	}
}

export async function getDebtorCount(organizationId: string): Promise<number> {
	try {
		const result = await db
			.select({ count: debtors.id })
			.from(debtors)
			.where(eq(debtors.organizationId, organizationId));
		return result.length;
	} catch (error) {
		throw error;
	}
}

export async function getDebtorCountByUser(
	organizationId: string,
	userId: string
): Promise<number> {
	try {
		const result = await db
			.select({ count: debtors.id })
			.from(debtors)
			.where(
				and(
					eq(debtors.organizationId, organizationId),
					eq(debtors.createdByUserId, userId)
				)
			);
		return result.length;
	} catch (error) {
		throw error;
	}
}
