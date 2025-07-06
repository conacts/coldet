import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { token, amount, currency = 'usd' } = await request.json();

    if (!token || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: token and amount' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Account Resolution - ${token}`,
              description: 'Debt settlement payment',
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/pay/${token}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pay/${token}`,
      metadata: {
        accountToken: token,
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
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}