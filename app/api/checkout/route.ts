import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
	try {
		const { id, amount, currency = 'usd' } = await request.json();

		if (!(id && amount)) {
			return NextResponse.json(
				{ error: 'Missing required fields: id and amount' },
				{ status: 400 }
			);
		}

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: [
				{
					price_data: {
						currency,
						product_data: {
							name: `Account Resolution - ${id}`,
							description: 'Debt settlement payment',
						},
						unit_amount: amount, // Amount in cents
					},
					quantity: 1,
				},
			],
			mode: 'payment',
			success_url: `${process.env.NEXT_PUBLIC_URL}/pay/${id}/success`,
			cancel_url: `${process.env.NEXT_PUBLIC_URL}/pay/${id}`,
			metadata: {
				accountId: id,
				paymentType: 'debt_settlement',
			},
			// Enable payment methods for mobile optimization
			payment_method_options: {
				card: {
					request_three_d_secure: 'automatic',
				},
			},
		});

		return NextResponse.json({ sessionId: session.id });
	} catch {
		return NextResponse.json(
			{ error: 'Failed to create checkout session' },
			{ status: 500 }
		);
	}
}

