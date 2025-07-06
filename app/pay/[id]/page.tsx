import { notFound, redirect } from 'next/navigation';
import PaymentForm from '@/components/payment-form';
import { getDebtById } from '@/lib/db/debts';

export default async function PayPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const debt = await getDebtById(id);

	if (!debt) {
		notFound();
	}

	if (debt.status === 'resolved') {
		redirect(`/pay/${id}/success`);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<PaymentForm debt={debt} />
		</div>
	);
}
