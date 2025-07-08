import { render } from '@react-email/render';
import { EmailResponseEmail } from '@/emails/email-response';
import { getDebtById, getDebtsByDebtorEmail } from '@/lib/db/debts';
import {
	createThread,
	getEmailsByThreadId,
	getThreadByDebtorAndSubject,
	getThreadByMessageId,
} from '@/lib/db/email-threads';
import { createEmail } from '@/lib/db/emails';
import type { Debt, Email, EmailThread } from '@/lib/db/schema';
import type { EmailResponse } from '@/lib/llms';
import { generateResponseEmail } from '@/lib/llms';
import { generateUUID } from '@/lib/utils';
import type { SesSnsNotification } from '@/types/aws-ses';
import { sendEmail } from './aws/ses';

const WHITESPACE_REGEX = /\s+/;

export interface SendEmailResponseParams {
	to: string;
	emailResponse: EmailResponse;
	thread: EmailThread;
	debt: Debt;
	inReplyToEmail?: Email;
	emailHistory?: Email[];
}

export async function handleReceivedEmail(
	notification: SesSnsNotification
): Promise<void> {
	const sender = parseInboundEmailSender(notification.mail);
	const { thread, emails: emailHistory } = await findOrCreateEmailThread(
		notification,
		sender
	);
	const debtAccount = await getDebtById(thread.debtorId);

	if (!debtAccount) {
		throw new Error('BAD ERROR: No debt account found for debtor');
	}

	// Store the inbound email in the database
	const inboundEmail = await createEmail({
		debtId: thread.debtorId,
		threadId: thread.id,
		messageId: notification.mail.messageId,
		direction: 'inbound',
		subject: notification.mail.commonHeaders.subject,
		content: parseInboundEmailContent(notification.content),
	});

	// Generate AI response
	const emailResponse = await generateResponseEmail(emailHistory, debtAccount);

	// Send email response back to the debtor
	await sendEmailResponse({
		to: sender,
		emailResponse,
		thread,
		debt: debtAccount,
		inReplyToEmail: inboundEmail,
		emailHistory,
	});
}

export async function findOrCreateEmailThread(
	notification: SesSnsNotification,
	sender: string
): Promise<{ thread: EmailThread; emails: Email[] }> {
	const subject = notification.mail.commonHeaders.subject || '';
	const headers = notification.mail.headers || [];

	// 1. Try to find thread by In-Reply-To or References (if this is a reply)
	let thread: EmailThread | null = null;
	const inReplyTo = headers.find(
		(h) => h.name.toLowerCase() === 'in-reply-to'
	)?.value;
	const references = headers.find(
		(h) => h.name.toLowerCase() === 'references'
	)?.value;

	if (inReplyTo) {
		thread = await getThreadByMessageId(inReplyTo);
	}
	if (!thread && references) {
		const refIds = references.split(WHITESPACE_REGEX);
		thread = await getThreadByMessageId(refIds.at(-1) || '');
	}

	// 2. If not a reply, try to find thread by sender email + subject
	if (!thread) {
		const debtors = await getDebtsByDebtorEmail(sender);
		if (debtors.length > 0) {
			thread = await getThreadByDebtorAndSubject(debtors[0].debtorId, subject);
		}
	}

	// 3. Create new thread if none found
	if (!thread) {
		const debtors = await getDebtsByDebtorEmail(sender);
		if (!debtors.length) {
			throw new Error('No debtor found for sender email');
		}
		thread = await createThread(debtors[0].debtorId, subject);
	}

	// 4. Get email history for this thread (chronologically sorted)
	const emails = await getEmailsByThreadId(thread.id);

	return { thread, emails };
}

export function parseInboundEmailSender(
	mail: SesSnsNotification['mail']
): string {
	const sender = mail.commonHeaders.from?.[0];
	if (!sender) {
		throw new Error('Could not parse sender email from mail headers');
	}
	return sender;
}

export function parseInboundEmailContent(content?: string): string {
	if (!content) {
		throw new Error('Email content is required but was not provided');
	}
	return content;
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

	// TODO: should this just be the email thread id?
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

	const messageId = generateUUID();
	const emailHtml = await render(EmailResponseEmail({ emailResponse }));

	await sendEmail({
		to,
		from: fromEmail,
		replyTo: replyToEmail,
		subject: emailResponse.subject,
		htmlBody: emailHtml,
		messageId,
		inReplyTo,
		references,
		configurationSetName: 'email-tracking-config',
	});

	const savedEmail = await createEmail({
		debtId: debt.id,
		threadId: thread.id,
		messageId,
		direction: 'outbound',
		subject: emailResponse.subject,
		content: emailHtml,
		aiGenerated: true,
		complianceChecked: true,
	});

	return savedEmail;
}
