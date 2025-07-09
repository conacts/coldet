import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { type Debtor, debtors } from '@/lib/db/schema';

/**
 * Parameters for creating a new debtor - uses Debtor type with auto-generated fields excluded
 * NOTE: I feel there's a better way to do this, but I'm not sure what it is.
 */
// NOTE: I think this is kind of stupid. I think we can clean this up.
export type CreateDebtorParams = {
	firstName: string;
	lastName: string;
} & Partial<Omit<Debtor, 'id' | 'createdAt' | 'updatedAt' | 'firstName' | 'lastName'>>;

/**
 * Creates a new debtor record
 * @param params - The debtor information to create
 * @returns The created debtor record
 * @throws Error if creation fails or email already exists
 */
export async function createDebtor(params: CreateDebtorParams): Promise<Debtor> {
	try {
	const result = await db
		.insert(debtors)
		.values({
			firstName: params.firstName,
			lastName: params.lastName,
			email: params.email,
			phone: params.phone,
			addressLine1: params.addressLine1,
			addressLine2: params.addressLine2,
			city: params.city,
			state: params.state,
			zipCode: params.zipCode,
			phoneConsent: params.phoneConsent ?? false,
			emailConsent: params.emailConsent ?? true,
			dncRegistered: params.dncRegistered ?? false,
			currentlyCollecting: params.currentlyCollecting ?? false,
		})
		.returning();

		if (!result[0]) {
			throw new Error('Failed to create debtor record');
		}

		return result[0];
	} catch (error) {
		console.error('Error creating debtor:', error);
		throw error;
	}
}

/**
 * Updates the currentlyCollecting status for a specific debtor
 * @param debtorId - The ID of the debtor to update
 * @param currentlyCollecting - Whether collection activities should be active for this debtor
 * @returns The updated debtor record
 * @throws Error if debtor not found
 */
export async function updateCurrentlyCollecting(
	debtorId: string,
	currentlyCollecting: boolean
): Promise<Debtor> {
	const result = await db
		.update(debtors)
		.set({
			currentlyCollecting,
			updatedAt: new Date(),
		})
		.where(eq(debtors.id, debtorId))
		.returning();

	if (!result[0]) {
		throw new Error(`Debtor not found with ID: ${debtorId}`);
	}

	return result[0];
}

/**
 * Get a debtor by ID
 * @param debtorId - The ID of the debtor to retrieve
 * @returns The debtor record or null if not found
 */
export async function getDebtorById(debtorId: string): Promise<Debtor | null> {
	const result = await db
		.select()
		.from(debtors)
		.where(eq(debtors.id, debtorId))
		.limit(1);

	return result[0] ?? null;
}

/**
 * Get a debtor by email address
 * @param email - The email address to search for
 * @returns The debtor record or null if not found
 */
export async function getDebtorByEmail(email: string): Promise<Debtor | null> {
	const result = await db
		.select()
		.from(debtors)
		.where(eq(debtors.email, email))
		.limit(1);

	return result[0] ?? null;
}
