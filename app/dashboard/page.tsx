import { render } from '@react-email/render';
import TestingButtons from '@/components/testing-buttons';
import TestEmail from '@/emails/first-email';
import { sendEmail } from '@/lib/aws/ses';
import { createDebtor } from '@/lib/db/debtors';
import { createDebt } from '@/lib/db/debts';
import { createEmailThread } from '@/lib/db/email-threads';
import { createEmail } from '@/lib/db/emails';

async function createDebtorAction(formData: FormData) {
	'use server';

	try {
		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;

		if (!(firstName && lastName && email)) {
			return {
				success: false,
				message: 'First name, last name, and email are required!',
			};
		}

		const debtor = await createDebtor({
			firstName,
			lastName,
			email,
			phone: phone || null,
			emailConsent: true, // Default to true for testing
			currentlyCollecting: false,
		});

		return {
			success: true,
			message: 'Debtor created successfully!',
			debtorId: debtor.id,
		};
	} catch {
		return { success: false, message: 'Failed to create debtor' };
	}
}

async function createDebtAction(debtorId: string, formData: FormData) {
	'use server';

	try {
		const totalOwedStr = formData.get('totalOwed') as string;
		const originalCreditor = formData.get('originalCreditor') as string;

		if (!(totalOwedStr && originalCreditor)) {
			return {
				success: false,
				message: 'Total owed amount and original creditor are required!',
			};
		}

		// Validate that totalOwed is a valid number
		const totalOwedNum = Number.parseFloat(totalOwedStr);
		if (Number.isNaN(totalOwedNum) || totalOwedNum < 0) {
			return {
				success: false,
				message: 'Total owed must be a valid positive number!',
			};
		}

		const debt = await createDebt({
			debtorId,
			originalCreditor,
			totalOwed: totalOwedNum, // Now using number type
			status: 'active',
		});

		return {
			success: true,
			message: 'Debt created successfully!',
			debtId: debt.id,
		};
	} catch {
		return { success: false, message: 'Failed to create debt' };
	}
}

async function sendTestEmailAction(
	debtorId: string,
	debtId: string,
	email: string
) {
	'use server';

	try {
		const emailHtml = await render(TestEmail());

		const messageId = await sendEmail({
			to: email,
			from: 'chris@coldets.com',
			subject: 'Test Email with Tracking',
			htmlBody: emailHtml,
			configurationSetName: 'email-tracking-config',
		});

		const thread = await createEmailThread(
			debtorId,
			'Test Email with Tracking'
		);


		await createEmail({
			debtId,
			threadId: thread.id,
			fromEmailAddress: 'chris@coldets.com',
			messageId,
			direction: 'outbound',
			subject: 'Test Email with Tracking',
		});

		return {
			success: true,
			message: 'Email sent successfully!',
		};
	} catch {
		return {
			success: false,
			message: 'Failed to send email.',
		};
	}
}

export default function DashboardPage() {
	return (
		<div className="container mx-auto space-y-6 p-6">
			<h1 className="font-bold text-3xl">Dashboard</h1>

			<TestingButtons
				createDebtAction={createDebtAction}
				createDebtorAction={createDebtorAction}
				sendTestEmailAction={sendTestEmailAction}
			/>
		</div>
	);
}
