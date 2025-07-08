'use client';

import { CheckCircle, Download } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Confetti, type ConfettiRef } from '@/components/magicui/confetti';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type { Debt } from '@/lib/db/schema';

export default function SuccessContent({ debt }: { debt: Debt }) {
	const confettiRef = useRef<ConfettiRef>(null);

	useEffect(() => {
		confettiRef.current?.fire({});
	}, []);

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
			<Confetti
				className="absolute top-0 left-0 z-0 h-full w-full"
				ref={confettiRef}
			/>
			<Card className="relative z-10 w-full max-w-md text-center">
				<CardHeader>
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
						<CheckCircle className="h-8 w-8" />
					</div>
					<CardTitle className="font-bold text-2xl">
						Payment Successful!
					</CardTitle>
					<CardDescription>
						Your account has been resolved. Thank you for your payment.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Account:</span>
							<span className="font-medium">{debt.id}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Payment Status:</span>
							<span className="font-medium">Completed</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Amount Paid:</span>
							<span className="font-medium">${debt.amountPaid ?? '0.00'}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Transaction Date:</span>
							<span className="font-medium" />
						</div>
					</div>

					<div className="rounded-md p-4">
						<p className="text-sm">
							Your payment has been processed successfully. You will receive an
							email confirmation shortly with your receipt.
						</p>
					</div>

					<div>
						<Button
							className="w-full cursor-pointer"
							size="lg"
							variant="outline"
						>
							<Download className="mr-2 h-4 w-4" />
							Download Receipt
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
