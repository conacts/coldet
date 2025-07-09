import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { Debt } from '@/lib/db/schema';
import { debtors, debts } from '@/lib/db/schema';

/**
 * Parameters for creating a new debt - uses Debt type with auto-generated fields excluded
 */
export type CreateDebtParams = {
	debtorId: string;
	originalCreditor: string;
} & Partial<Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'debtorId' | 'originalCreditor'>>;

/**
 * Creates a new debt record
 * @param params - The debt information to create (uses Debt type structure)
 * @returns The created debt record
 * @throws Error if creation fails
 */
export async function createDebt(params: CreateDebtParams): Promise<Debt> {
	try {
		const result = await db
			.insert(debts)
			.values({
				debtorId: params.debtorId,
				originalCreditor: params.originalCreditor,
				totalOwed: params.totalOwed ?? 0,
				amountPaid: params.amountPaid ?? 0,
				status: params.status ?? 'active',
				debtDate: params.debtDate,
			})
			.returning();

		if (!result[0]) {
			throw new Error('Failed to create debt record');
		}

		return result[0];
	} catch (error) {
		console.error('Error creating debt:', error);
		throw error;
	}
}

export async function getDebtById(id: string): Promise<Debt | null> {
	const result = await db.select().from(debts).where(eq(debts.id, id)).limit(1);
	return result[0] ?? null;
}

// TODO: This potentially causes issues if we don't merge the debtors into one specific debtor.
// It assumes all debtors with the same email are the same debtor, which may not be the case.
// Not sure the best solution to this.
export async function getDebtsByDebtorEmail(email: string): Promise<Debt[]> {
	const result = await db
		.select()
		.from(debts)
		.innerJoin(debtors, eq(debts.debtorId, debtors.id))
		.where(eq(debtors.email, email));
	// Map to just debts (assuming result is array of { debts: Debt, debtors: Debtor })
	return result.map(row => row.debts);
}

export async function getDebtByDebtorId(debtorId: string): Promise<Debt | null> {
	const result = await db
		.select()
		.from(debts)
		.where(eq(debts.debtorId, debtorId))
		.limit(1);
	return result[0] ?? null;
}

export async function paidDebt({
	id,
	amountPaid,
	status = 'resolved',
}: {
	id: string;
	amountPaid: number;
	status?: string;
}): Promise<void> {
	try {
		await db
			.update(debts)
			.set({ amountPaid, status })
			.where(eq(debts.id, id));
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error paying debt', error);
		throw error;
	}
}
