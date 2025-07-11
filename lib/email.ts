import { render } from '@react-email/render';
import { EmailResponseEmail } from '@/emails/email-response';
import { sendEmail } from '@/lib/aws/ses';
import { getDebtorById } from '@/lib/db/debtors';
import { getDebtByDebtorId, getDebtsByDebtorEmail } from '@/lib/db/debts';
import {
	createEmailThread,
	getEmailsByThreadId,
	getThreadByMessageId,
} from '@/lib/db/email-threads';
import { createEmail } from '@/lib/db/emails';
import type { Debt, Email, EmailThread } from '@/lib/db/schema';
import type { EmailResponse } from '@/lib/llms';
import { generateResponseEmail } from '@/lib/llms';
import type { SesSnsNotification } from '@/types/aws-ses';
import { extractMessageIdFromEmailHeader } from './utils';

export interface SendEmailResponseParams {
	to: string;
	emailResponse: EmailResponse;
	thread: EmailThread;
	debt: Debt;
	replyToMessageId?: string;
	emailHistory?: Email[];
}

export async function handleReceivedEmail(
	notification: SesSnsNotification
): Promise<void> {
	const sender = parseSESInboundEmailSender(notification.mail);
	const { thread, replyToMessageId } = await findOrCreateEmailThread(
		notification,
		sender
	);

	const emailHistory = await getEmailsByThreadId(thread.id);

	const debtAccount = await getDebtByDebtorId(thread.debtorId);

	if (!debtAccount) {
		throw new Error('BAD ERROR: No debt account found for debtor');
	}

	const debtId = debtAccount.id;
	const threadId = thread.id;
	const subject = notification.mail.commonHeaders.subject;
	const content = parseSESInboundEmailContent(notification.content);
	const inboundMessageId = notification.mail.messageId;

	const inboundEmail = await createEmail({
		organizationId: thread.organizationId,
		debtId,
		threadId,
		fromEmailAddress: sender,
		direction: 'inbound',
		messageId: inboundMessageId,
		subject,
		replyTo: replyToMessageId,
		content,
	});

	const emailResponse = await generateResponseEmail(emailHistory, debtAccount);

	await sendEmailResponse({
		to: sender,
		emailResponse,
		thread,
		debt: debtAccount,
		replyToMessageId: inboundEmail.messageId,
	});
}

export async function findOrCreateEmailThread(
	notification: SesSnsNotification,
	sender: string
): Promise<{ thread: EmailThread; replyToMessageId: string }> {
	const subject = notification.mail.commonHeaders.subject || '';
	const headers = notification.mail.headers || [];
	let thread: EmailThread | null = null;

	// Try to find existing thread using In-Reply-To header
	const inReplyToHeader = headers.find(
		(h) => h.name.toLowerCase() === 'in-reply-to'
	)?.value;

	const inReplyToMessageId = inReplyToHeader
		? extractMessageIdFromEmailHeader(inReplyToHeader)
		: null;

	if (inReplyToMessageId) {
		thread = await getThreadByMessageId(inReplyToMessageId);
	}

	// If no existing thread found, create a new one
	if (!thread) {
		const debts = await getDebtsByDebtorEmail(sender);
		if (!debts.length) {
			throw new Error('No debtor found for sender email');
		}

		// Get the debtor info to access organizationId
		const debtor = await getDebtorById(debts[0].debtorId);
		if (!debtor) {
			throw new Error('No debtor found for debt');
		}

		thread = await createEmailThread(debtor.organizationId, debtor.id, subject);
	}

	// Determine the replyToMessageId for the inbound email
	let replyToMessageId: string | null = null;
	if (inReplyToHeader) {
		replyToMessageId = extractMessageIdFromEmailHeader(inReplyToHeader);
	}

	return { thread, replyToMessageId: replyToMessageId || '' };
}

export async function sendEmailResponse({
	to,
	emailResponse,
	thread,
	debt,
	replyToMessageId,
}: SendEmailResponseParams): Promise<Email> {
	const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@yourdomain.com';

	const emailHtml = await render(EmailResponseEmail({ emailResponse }));

	const sentMessageId = await sendEmail({
		to,
		from: fromEmail,
		subject: emailResponse.subject,
		htmlBody: emailHtml,
		configurationSetName: 'email-tracking-config',
	});

	const savedEmail = await createEmail({
		organizationId: thread.organizationId,
		debtId: debt.id,
		threadId: thread.id,
		fromEmailAddress: fromEmail,
		messageId: sentMessageId,
		direction: 'outbound',
		subject: emailResponse.subject,
		content: emailHtml,
		replyTo: replyToMessageId,
		aiGenerated: true,
	});

	return savedEmail;
}

// ----------------

export function parseSESInboundEmailSender(
	mail: SesSnsNotification['mail']
): string {
	const sender = mail.commonHeaders.returnPath;
	if (!sender) {
		throw new Error('Could not parse sender email from mail headers');
	}
	return sender;
}

export function parseSESInboundEmailContent(content?: string): string {
	if (!content) {
		throw new Error('Email content is required but was not provided');
	}
	return content;
}
