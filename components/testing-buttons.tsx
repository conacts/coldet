'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TestingButtonsProps {
	createDebtorAction: (
		formData: FormData
	) => Promise<{ success: boolean; message: string; debtorId?: string }>;
	createDebtAction: (
		debtorId: string,
		formData: FormData
	) => Promise<{ success: boolean; message: string; debtId?: string }>;
	sendTestEmailAction: (
		debtorId: string,
		debtId: string,
		email: string
	) => Promise<{ success: boolean; message: string }>;
}

export default function TestingButtons({
	createDebtorAction,
	createDebtAction,
	sendTestEmailAction,
}: TestingButtonsProps) {
	const [step, setStep] = useState(1);
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
		{}
	);
	const [messages, setMessages] = useState<Record<string, string>>({});
	const [debtorId, setDebtorId] = useState<string>('');
	const [debtId, setDebtId] = useState<string>('');
	const [email, setEmail] = useState<string>('csheehan630@gmail.com');

	const handleDebtorCreate = async (formData: FormData) => {
		setLoadingStates((prev) => ({ ...prev, debtor: true }));
		setMessages((prev) => ({ ...prev, debtor: '' }));

		try {
			const result = await createDebtorAction(formData);
			setMessages((prev) => ({ ...prev, debtor: result.message }));

			if (result.success && result.debtorId) {
				setDebtorId(result.debtorId);
				setStep(2);
			}
		} catch {
			setMessages((prev) => ({ ...prev, debtor: 'Failed to create debtor' }));
		} finally {
			setLoadingStates((prev) => ({ ...prev, debtor: false }));
		}
	};

	const handleDebtCreate = async (formData: FormData) => {
		setLoadingStates((prev) => ({ ...prev, debt: true }));
		setMessages((prev) => ({ ...prev, debt: '' }));

		try {
			const result = await createDebtAction(debtorId, formData);
			setMessages((prev) => ({ ...prev, debt: result.message }));

			if (result.success && result.debtId) {
				setDebtId(result.debtId);
				setStep(3);
			}
		} catch {
			setMessages((prev) => ({ ...prev, debt: 'Failed to create debt' }));
		} finally {
			setLoadingStates((prev) => ({ ...prev, debt: false }));
		}
	};

	const handleEmailSend = async () => {
		setLoadingStates((prev) => ({ ...prev, email: true }));
		setMessages((prev) => ({ ...prev, email: '' }));

		try {
			console.log('Sending email to:', email);
			console.log('Debtor ID:', debtorId);
			console.log('Debt ID:', debtId);
			const result = await sendTestEmailAction(debtorId, debtId, email);
			console.log('Email result:', result);
			setMessages((prev) => ({ ...prev, email: result.message }));
		} catch {
			setMessages((prev) => ({
				...prev,
				email: 'Failed to send email, check the console for more details.',
			}));
		} finally {
			setLoadingStates((prev) => ({ ...prev, email: false }));
		}
	};

	const resetFlow = () => {
		setStep(1);
		setDebtorId('');
		setDebtId('');
		setMessages({});
		setLoadingStates({});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Debt Collection Testing Flow</CardTitle>
				<p className="text-muted-foreground text-sm">
					Step {step} of 3:{' '}
					{(() => {
						if (step === 1) {
							return 'Create Debtor';
						}
						if (step === 2) {
							return 'Create Debt';
						}
						return 'Send Test Email';
					})()}
				</p>
			</CardHeader>
			<CardContent className="space-y-6">
				{step === 1 && (
					<form action={handleDebtorCreate} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="firstName">First Name</Label>
								<Input
									defaultValue="John"
									id="firstName"
									name="firstName"
									required
								/>
							</div>
							<div>
								<Label htmlFor="lastName">Last Name</Label>
								<Input
									defaultValue="Doe"
									id="lastName"
									name="lastName"
									required
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								defaultValue="csheehan630@gmail.com"
								id="email"
								name="email"
								onChange={(e) => setEmail(e.target.value)}
								required
								type="email"
							/>
						</div>
						<div>
							<Label htmlFor="phone">Phone (Optional)</Label>
							<Input defaultValue="555-123-4567" id="phone" name="phone" />
						</div>
						<Button
							className="w-full"
							disabled={loadingStates.debtor}
							type="submit"
						>
							{loadingStates.debtor ? 'Creating Debtor...' : 'Create Debtor'}
						</Button>
						{messages.debtor && (
							<p
								className={`text-xs ${messages.debtor.includes('success') ? 'text-green-600' : 'text-red-600'}`}
							>
								{messages.debtor}
							</p>
						)}
					</form>
				)}

				{step === 2 && (
					<form action={handleDebtCreate} className="space-y-4">
						<div>
							<Label htmlFor="originalCreditor">Original Creditor</Label>
							<Input
								defaultValue="ABC Collections"
								id="originalCreditor"
								name="originalCreditor"
								required
							/>
						</div>
						<div>
							<Label htmlFor="totalOwed">Total Owed ($)</Label>
							<Input
								defaultValue="1250.75"
								id="totalOwed"
								name="totalOwed"
								required
								step="0.01"
								type="number"
							/>
						</div>
						<div className="flex gap-2">
							<Button
								className="flex-1"
								onClick={resetFlow}
								type="button"
								variant="outline"
							>
								Start Over
							</Button>
							<Button
								className="flex-1"
								disabled={loadingStates.debt}
								type="submit"
							>
								{loadingStates.debt ? 'Creating Debt...' : 'Create Debt'}
							</Button>
						</div>
						{messages.debt && (
							<p
								className={`text-xs ${messages.debt.includes('success') ? 'text-green-600' : 'text-red-600'}`}
							>
								{messages.debt}
							</p>
						)}
					</form>
				)}

				{step === 3 && (
					<div className="space-y-4">
						<div className="rounded-lg bg-muted p-4 text-sm">
							<p>
								<strong>Debtor Created:</strong> {debtorId}
							</p>
							<p>
								<strong>Debt Created:</strong> {debtId}
							</p>
							<p>
								<strong>Email Address:</strong> {email}
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								className="flex-1"
								onClick={resetFlow}
								type="button"
								variant="outline"
							>
								Start Over
							</Button>
							<Button
								className="flex-1"
								disabled={loadingStates.email}
								onClick={handleEmailSend}
							>
								{loadingStates.email ? 'Sending Email...' : 'Send Test Email'}
							</Button>
						</div>
						{messages.email && (
							<p
								className={`text-xs ${messages.email.includes('success') ? 'text-green-600' : 'text-red-600'}`}
							>
								{messages.email}
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
