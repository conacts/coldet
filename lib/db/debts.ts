import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { Debt } from '@/lib/db/schema';
import { debtors, debts } from '@/lib/db/schema';

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

export async function paidDebt({
	id,
	amountPaid,
	status = 'resolved',
}: {
	id: string;
	amountPaid: string | number;
	status?: string;
}): Promise<void> {
	await db
		.update(debts)
		.set({ amountPaid: String(amountPaid), status })
		.where(eq(debts.id, id));
}
