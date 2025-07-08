import { getDebtById, getDebtsByDebtorEmail } from '@/lib/db/debts';
import {
	createThread,
	getEmailsByThreadId,
	getThreadByDebtorAndSubject,
	getThreadByMessageId,
} from '@/lib/db/email-threads';
import { createEmail } from '@/lib/db/emails';
import type { Email, EmailThread } from '@/lib/db/schema';
import { sendEmailResponse } from '@/lib/email-sender';
import { generateResponseEmail } from '@/lib/llms';
import type { SesSnsNotification } from '@/types/aws-ses';

const WHITESPACE_REGEX = /\s+/;

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
