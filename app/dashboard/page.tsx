import { render } from '@react-email/render';
import TestingButtons from '@/components/testing-buttons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TestEmail from '@/emails/first-email';
import { sendEmail } from '@/lib/aws/ses';

async function sendTestEmail() {
	'use server';

	try {
		const emailHtml = await render(TestEmail());

		await sendEmail({
			to: 'csheehan630@gmail.com',
			from: 'chris@coldets.com',
			subject: 'Test Email with Tracking',
			htmlBody: emailHtml,
			configurationSetName: 'email-tracking-config',
		});

		return { success: true, message: 'Email sent successfully!' };
	} catch {
		return { success: false, message: 'Failed to send email' };
	}
}

async function sendBounceTestEmail() {
	'use server';

	try {
		const emailHtml = await render(TestEmail());

		// Send to a known bad email address to trigger bounce
		await sendEmail({
			to: 'bounce@simulator.amazonses.com', // AWS SES bounce simulator
			from: 'chris@coldets.com',
			subject: 'Bounce Test Email',
			htmlBody: emailHtml,
			configurationSetName: 'email-tracking-config',
		});

		return {
			success: true,
			message:
				'Bounce test email sent! Should trigger bounce webhook in ~30 seconds.',
		};
	} catch {
		return { success: false, message: 'Failed to send bounce test email' };
	}
}

async function sendComplaintTestEmail() {
	'use server';

	try {
		const emailHtml = await render(TestEmail());

		// Send to AWS SES complaint simulator
		await sendEmail({
			to: 'complaint@simulator.amazonses.com', // AWS SES complaint simulator
			from: 'chris@coldets.com',
			subject: 'Complaint Test Email',
			htmlBody: emailHtml,
			configurationSetName: 'email-tracking-config',
		});

		return {
			success: true,
			message:
				'Complaint test email sent! Should trigger complaint webhook in ~30 seconds.',
		};
	} catch {
		return { success: false, message: 'Failed to send complaint test email' };
	}
}

async function sendClickTestEmail() {
	'use server';

	try {
		// Create email with prominent links for click testing
		const emailWithLinks = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #2563eb;">Click Test Email</h2>
				<p>This email contains multiple links to test click tracking:</p>
				
				<div style="margin: 20px 0;">
					<a href="https://coldets.com" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px;">
						Visit Our Website
					</a>
				</div>
				
				<div style="margin: 20px 0;">
					<a href="https://google.com" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px;">
						External Link Test
					</a>
				</div>
				
				<p>Or try this text link: <a href="https://example.com" style="color: #2563eb;">Example Link</a></p>
				
				<p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
					Click any link above to test the click tracking webhook.
				</p>
			</div>
		`;

		await sendEmail({
			to: 'csheehan630@gmail.com',
			from: 'chris@coldets.com',
			subject: 'Click Test Email - Please Click Links',
			htmlBody: emailWithLinks,
			configurationSetName: 'email-tracking-config',
		});

		return {
			success: true,
			message:
				'Click test email sent! Check your inbox and click the links to test click tracking.',
		};
	} catch {
		return { success: false, message: 'Failed to send click test email' };
	}
}

export default async function DashboardPage() {

	return (
		<div className="container mx-auto space-y-6 p-6">
			<h1 className="font-bold text-3xl">Dashboard</h1>

			<TestingButtons
				sendBounceTestEmail={sendBounceTestEmail}
				sendClickTestEmail={sendClickTestEmail}
				sendComplaintTestEmail={sendComplaintTestEmail}
				sendTestEmail={sendTestEmail}
			/>
		</div>
	);
}
