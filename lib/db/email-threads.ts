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

export async function createThread(
	debtorId: string,
	subject: string
): Promise<EmailThread> {
	const [thread] = await db
		.insert(emailThreads)
		.values({ debtorId, subject })
		.returning();
	return thread;
}

export async function getEmailsByThreadId(threadId: string): Promise<Email[]> {
	return await db
		.select()
		.from(emails)
		.where(eq(emails.threadId, threadId))
		.orderBy(desc(emails.timestamp));
}
