import { sendRawEmail } from '@/lib/aws/ses';
import { createEmail } from '@/lib/db/emails';
import type { Debt, Email, EmailThread } from '@/lib/db/schema';
import type { EmailResponse } from '@/lib/llms';
import { generateUUID } from '@/lib/utils';

export interface SendEmailResponseParams {
	to: string;
	emailResponse: EmailResponse;
	thread: EmailThread;
	debt: Debt;
	inReplyToEmail?: Email;
	emailHistory?: Email[];
}

export async function sendEmailResponse({
	to,
	emailResponse,
	thread,
	debt,
	inReplyToEmail,
	emailHistory = [],
}: SendEmailResponseParams): Promise<Email> {
	const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@yourdomain.com';
	const replyToEmail = process.env.SES_REPLY_TO_EMAIL || fromEmail;

	let inReplyTo: string | undefined;
	let references: string | undefined;

	if (inReplyToEmail?.messageId) {
		inReplyTo = inReplyToEmail.messageId;

		// Build references chain from email history
		const messageIds = emailHistory
			.filter((email) => email.messageId)
			.map((email) => email.messageId)
			.filter(Boolean) as string[];

		if (messageIds.length > 0) {
			references = messageIds.join(' ');
		}
	}

	// Convert response to plain text
	const textBody = convertToText(emailResponse);
	const messageId = generateUUID();

	// Send email via AWS SES (text only)
	await sendRawEmail({
		to,
		from: fromEmail,
		replyTo: replyToEmail,
		subject: emailResponse.subject,
		htmlBody: textBody,
		textBody,
		messageId,
		inReplyTo,
		references,
	});

	// Store outbound email in database
	const savedEmail = await createEmail({
		debtId: debt.id,
		threadId: thread.id,
		messageId,
		direction: 'outbound',
		subject: emailResponse.subject,
		content: textBody,
		aiGenerated: true,
		complianceChecked: true,
	});

	return savedEmail;
}

function convertToText(emailResponse: EmailResponse): string {
	return `${emailResponse.body}\n\n${emailResponse.signature}`.trim();
}
