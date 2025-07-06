import { notFound } from 'next/navigation';
import SuccessContent from '@/components/success-content';
import { getDebtById } from '@/lib/db/debts';

export default async function SuccessPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const debt = await getDebtById(id);
	if (!debt) {
		notFound();
	}
	return <SuccessContent debt={debt} />;
}
