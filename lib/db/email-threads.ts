import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
	type Email,
	type EmailThread,
	emails,
	emailThreads,
} from '@/lib/db/schema';

export async function getThreadByMessageId(
	messageId: string
): Promise<EmailThread | null> {
	const email = await db
		.select()
		.from(emails)
		.where(eq(emails.messageId, messageId))
		.limit(1);
	const found = email[0];
	if (!found?.threadId) {
		return null;
	}
	const thread = await db
		.select()
		.from(emailThreads)
		.where(eq(emailThreads.id, found.threadId))
		.limit(1);
	return thread[0] ?? null;
}

export async function getThreadByDebtorAndSubject(
	debtorId: string,
	subject: string
): Promise<EmailThread | null> {
	const thread = await db
		.select()
		.from(emailThreads)
		.where(
			and(
				eq(emailThreads.debtorId, debtorId),
				eq(emailThreads.subject, subject)
			)
		)
		.limit(1);
	return thread[0] ?? null;
}

export async function getEmailsByThreadId(threadId: string): Promise<Email[]> {
	return await db
		.select()
		.from(emails)
		.where(eq(emails.threadId, threadId))
		.orderBy(desc(emails.timestamp));
}

export async function createEmailThread(
	organizationId: string,
	debtorId: string,
	subject: string
): Promise<EmailThread> {
	try {
		const [thread] = await db
			.insert(emailThreads)
			.values({ organizationId, debtorId, subject })
			.returning();
		return thread;
	} catch (error) {
		throw error;
	}
}

/**
 * Build References header chain from emails in a thread
 * Returns array of Message-IDs in chronological order
 */
// I think this is unnecessary / shouldn't be here. we should sort it after we pull it
export async function buildReferencesChain(threadId: string): Promise<string[]> {
	const threadEmails = await getEmailsByThreadId(threadId);
	// Sort by timestamp (oldest first) and extract messageIds
	return threadEmails
		.sort((a, b) => {
			const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
			const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
			return timeA - timeB;
		})
		.map((email) => {
			return email.messageId;
		});
}

/**
 * Get the most recent email in a thread (for replying to)
 */
export async function getLatestEmailInThread(threadId: string): Promise<Email | null> {
	const threadEmails = await getEmailsByThreadId(threadId);
	if (threadEmails.length === 0) {
		return null;
	}

	// getEmailsByThreadId returns emails in desc order by timestamp, so first is latest
	return threadEmails[0];
}

/**
 * Get thread with email history for display
 */
export async function getThreadWithEmails(threadId: string): Promise<{
	thread: EmailThread | null;
	emails: Email[];
}> {
	const [threadResult, threadEmailList] = await Promise.all([
		db.select().from(emailThreads).where(eq(emailThreads.id, threadId)).limit(1),
		getEmailsByThreadId(threadId)
	]);

	return {
		thread: threadResult[0] ?? null,
		emails: threadEmailList
	};
}