import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { debts } from './schema';

export async function getDebtById(id: string) {
	const result = await db.select().from(debts).where(eq(debts.id, id)).limit(1);
	return result[0] ?? null;
}

export async function paidDebt({ id, amountPaid, status = 'resolved' }: { id: string; amountPaid: string | number; status?: string }) {
	return await db.update(debts)
		.set({ amountPaid: String(amountPaid), status })
		.where(eq(debts.id, id));
}
