'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestingButtonsProps {
	sendTestEmail: () => Promise<{ success: boolean; message: string }>;
	sendBounceTestEmail: () => Promise<{ success: boolean; message: string }>;
	sendComplaintTestEmail: () => Promise<{ success: boolean; message: string }>;
	sendClickTestEmail: () => Promise<{ success: boolean; message: string }>;
}

export default function TestingButtons({
	sendTestEmail,
	sendBounceTestEmail,
	sendComplaintTestEmail,
	sendClickTestEmail,
}: TestingButtonsProps) {
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
		{}
	);
	const [messages, setMessages] = useState<Record<string, string>>({});

	const handleTest = async (
		testType: string,
		testFunction: () => Promise<{ success: boolean; message: string }>
	) => {
		setLoadingStates((prev) => ({ ...prev, [testType]: true }));
		setMessages((prev) => ({ ...prev, [testType]: '' }));

		try {
			const result = await testFunction();
			setMessages((prev) => ({ ...prev, [testType]: result.message }));
		} catch {
			setMessages((prev) => ({ ...prev, [testType]: 'Failed to send email' }));
		} finally {
			setLoadingStates((prev) => ({ ...prev, [testType]: false }));
		}
	};

	const tests = [
		{
			key: 'normal',
			title: 'Open Tracking Test',
			description:
				'Send email with tracking pixel. Open the email to trigger the /opened webhook.',
			buttonText: 'Send Test Email',
			testFunction: sendTestEmail,
		},
		{
			key: 'click',
			title: 'Click Tracking Test',
			description:
				'Send email with trackable links. Click any link to trigger the /clicked webhook.',
			buttonText: 'Send Click Test',
			testFunction: sendClickTestEmail,
		},
		{
			key: 'bounce',
			title: 'Bounce Test',
			description:
				'Send to AWS bounce simulator to trigger the /bounced webhook.',
			buttonText: 'Send Bounce Test',
			testFunction: sendBounceTestEmail,
		},
		{
			key: 'complaint',
			title: 'Complaint Test',
			description:
				'Send to AWS complaint simulator to trigger the /complained webhook.',
			buttonText: 'Send Complaint Test',
			testFunction: sendComplaintTestEmail,
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Webhook Testing</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
					{tests.map((test) => (
						<div className='space-y-3 rounded-lg border p-4' key={test.key}>
							<div>
								<h3 className="font-semibold text-sm">{test.title}</h3>
								<p className="text-muted-foreground text-xs">
									{test.description}
								</p>
							</div>

							<Button
								className="w-full"
								disabled={loadingStates[test.key]}
								onClick={() => handleTest(test.key, test.testFunction)}
								size="sm"
							>
								{loadingStates[test.key] ? 'Sending...' : test.buttonText}
							</Button>

							{messages[test.key] && (
								<p
									className={`text-xs ${messages[test.key].includes('success') ||
											messages[test.key].includes('sent')
											? 'text-green-600'
											: 'text-red-600'
										}`}
								>
									{messages[test.key]}
								</p>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
