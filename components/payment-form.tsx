'use client';

import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Loader2, Mail, Phone, Shield } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Debt } from '@/lib/db/schema';

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

export default function PaymentForm({ debt }: { debt: Debt }) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handlePayment = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: debt.id,
					amount: Number(debt.totalOwed) * 100, // cents
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
		} catch {
			setError('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleContactUs = () => {
		// Implement contact logic if needed
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="font-bold text-2xl">
					Resolve Your Account
				</CardTitle>
				<CardDescription>
					Complete your payment to resolve account
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Account:</span>
						<span className="font-medium">{debt.id}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Amount Due:</span>
						<span className="font-medium text-lg">
							${Number(debt.totalOwed).toFixed(2)}
						</span>
					</div>
				</div>
				{error && (
					<div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
						{error}
					</div>
				)}
				<div className="space-y-3">
					<Button
						className="w-full cursor-pointer"
						disabled={isLoading}
						onClick={handlePayment}
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
								Pay Now - Secure Checkout
							</>
						)}
					</Button>
					<div className="text-center text-muted-foreground text-xs">
						Supports Apple Pay, Google Pay, and all major cards
					</div>
				</div>
				<Separator />
				<div>
					<div className="mb-4 text-center text-muted-foreground text-sm">
						Need help? Contact us:
					</div>
					<div className="grid grid-cols-2 gap-2 text-sm">
						<Button
							className="w-full cursor-pointer"
							onClick={handleContactUs}
							size="sm"
							variant="outline"
						>
							<Phone className="mr-2 h-4 w-4" />
							Call Us
						</Button>
						<Button
							className="w-full cursor-pointer"
							onClick={handleContactUs}
							size="sm"
							variant="outline"
						>
							<Mail className="mr-2 h-4 w-4" />
							Email
						</Button>
					</div>
				</div>
				<div className="flex items-center justify-center space-x-2 text-muted-foreground text-xs">
					<Shield className="h-4 w-4" />
					<span>Secure payment powered by Stripe</span>
				</div>
			</CardContent>
		</Card>
	);
}
