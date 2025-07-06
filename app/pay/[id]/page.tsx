'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PayPageProps {
	params: Promise<{ id: string }>;
}

export default function PayPage({ params }: PayPageProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [id, setId] = useState<string | null>(null);

	  // Unwrap params
  useEffect(() => {
    params.then((resolvedParams) => {
      setId(resolvedParams.id);
    });
  }, [params]);

	const handlePayment = async () => {
		if (!id) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id,
					amount: 2000, // $20.00 in cents - you can make this dynamic
					currency: 'usd',
				}),
			});

			const { sessionId, error: apiError } = await response.json();

			if (apiError) {
				setError(apiError);
				return;
			}

			const stripe = await stripePromise;
			if (!stripe) {
				setError('Stripe failed to load');
				return;
			}

			const { error: stripeError } = await stripe.redirectToCheckout({
				sessionId,
			});

			if (stripeError) {
				setError(stripeError.message || 'Payment failed');
			}
		} catch (err) {
			setError('An unexpected error occurred');
			console.error('Payment error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	if (!id) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">Payment</CardTitle>
					<CardDescription>
						Complete your payment for order #{id}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Order ID:</span>
							<span className="font-medium">{id}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Amount:</span>
							<span className="font-medium">$20.00</span>
						</div>
					</div>

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					<Button
						onClick={handlePayment}
						disabled={isLoading}
						className="w-full"
						size="lg"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : (
							<>
								<CreditCard className="mr-2 h-4 w-4" />
								Pay with Stripe
							</>
						)}
					</Button>

					<p className="text-xs text-muted-foreground text-center">
						Secure payment powered by Stripe
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
