import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { paidDebt } from '@/lib/db/debts';

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
	const sig = request.headers.get('stripe-signature');
	if (!process.env.STRIPE_WEBHOOK_SECRET) {
		return new Response('Webhook secret not set', { status: 500 });
	}
	let event: Stripe.Event;
	const body = await request.text();
	try {
		event = stripe.webhooks.constructEvent(
			body,
			sig || '',
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch {
		return new Response('Webhook signature verification failed', {
			status: 400,
		});
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session;
		const accountId = session.metadata?.accountId;
		const amountPaid = session.amount_total;
		if (accountId && amountPaid) {
			await paidDebt({
				id: accountId,
				amountPaid: (amountPaid / 100).toFixed(2),
			});
		}
	}

	return new Response('ok', { status: 200 });
}
