'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, CreditCard, Phone, Mail, Shield } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PayPageProps {
	params: Promise<{ token: string }>;
}

export default function PayPage(props: PayPageProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [pageLoadTime] = useState(Date.now());

	// Handle async params in Next.js 15
	useEffect(() => {
		const getToken = async () => {
			const resolvedParams = await props.params;
			setToken(resolvedParams.token);
			
			// Track page visit for engagement scoring
			trackPageVisit(resolvedParams.token);
		};
		
		getToken();
	}, [props.params]);

	const trackPageVisit = async (token: string) => {
		try {
			await fetch('/api/track/page-visit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token,
					event: 'payment_page_visit',
					timestamp: Date.now(),
					userAgent: navigator.userAgent,
					isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
				}),
			});
		} catch (error) {
			console.error('Failed to track page visit:', error);
		}
	};

	const handlePayment = async () => {
		if (!token) return;

		setIsLoading(true);
		setError(null);

		try {
			// Track payment attempt
			await fetch('/api/track/page-visit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token,
					event: 'payment_button_click',
					timestamp: Date.now(),
					timeOnPage: Date.now() - pageLoadTime,
				}),
			});

			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token,
					amount: 2000, // This should be dynamic based on debt amount
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

	const handleContactUs = () => {
		// Track contact button click
		if (token) {
			fetch('/api/track/page-visit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token,
					event: 'contact_button_click',
					timestamp: Date.now(),
				}),
			});
		}
	};

	if (!token) {
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
					<CardTitle className="text-2xl font-bold">Resolve Your Account</CardTitle>
					<CardDescription>
						Complete your payment to resolve account #{token}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Account:</span>
							<span className="font-medium">{token}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Amount Due:</span>
							<span className="font-medium text-lg">$20.00</span>
						</div>
						<div className="text-xs text-muted-foreground">
							* Settlement options may be available
						</div>
					</div>

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					<div className="space-y-3">
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
									Pay Now - Secure Checkout
								</>
							)}
						</Button>

						<div className="text-xs text-center text-muted-foreground">
							Supports Apple Pay, Google Pay, and all major cards
						</div>
					</div>

					<div className="pt-4 border-t">
						<div className="text-sm text-center text-muted-foreground mb-3">
							Need help? Contact us:
						</div>
						<div className="flex flex-col space-y-2 text-sm">
							<Button
								variant="outline"
								size="sm"
								onClick={handleContactUs}
								className="w-full"
							>
								<Phone className="mr-2 h-4 w-4" />
								Call Us
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleContactUs}
								className="w-full"
							>
								<Mail className="mr-2 h-4 w-4" />
								Email Support
							</Button>
						</div>
					</div>

					<div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
						<Shield className="h-4 w-4" />
						<span>Secure payment powered by Stripe</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
