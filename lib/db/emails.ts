import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { Email } from '@/lib/db/schema';
import { emails } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';

export async function createEmail({
	debtId,
	threadId,
	fromEmailAddress,
	messageId = generateUUID(),
	direction,
	subject,
	content,
	emailOpened = false,
	emailClicked = false,
	aiGenerated = false,
	complianceChecked = true,
	replyTo,
}: {
	debtId: string;
	threadId: string;
	fromEmailAddress: string;
	messageId: string;
	direction: 'inbound' | 'outbound';
	subject?: string | null;
	content?: string | null;
	emailOpened?: boolean;
	emailClicked?: boolean;
	aiGenerated?: boolean;
	complianceChecked?: boolean;
	replyTo?: string | null;
}): Promise<Email> {
	try {
		const [email] = await db
			.insert(emails)
			.values({
				debtId,
				threadId,
				fromEmailAddress,
				messageId,
				direction,
				subject,
				content,
				emailOpened,
				emailClicked,
				aiGenerated,
				complianceChecked,
				replyTo,
			})
			.returning();
		return email;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error creating email', error);
		throw error;
	}
}

export async function getEmailById(id: string): Promise<Email | null> {
	try {
		const result = await db
			.select()
			.from(emails)
			.where(eq(emails.id, id))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error getting email by id', error);
		throw error;
	}
}

export async function getEmailByMessageId(
	messageId: string
): Promise<Email | null> {
	try {
		const result = await db
			.select()
			.from(emails)
			.where(eq(emails.messageId, messageId))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error getting email by message id', error);
		throw error;
	}
}

export async function updateEmailOpened(messageId: string): Promise<Email | null> {
	try {
		const result = await db
			.update(emails)
			.set({ emailOpened: true })
			.where(eq(emails.messageId, messageId))
			.returning();
		return result[0] ?? null;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error updating email opened', error);
		throw error;
	}
}

export async function updateEmailClicked(messageId: string): Promise<Email | null> {
	try {
		const result = await db
			.update(emails)
			.set({ emailClicked: true })
			.where(eq(emails.messageId, messageId))
			.returning();
		return result[0] ?? null;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error updating email clicked', error);
		throw error;
	}
}

export async function updateEmailBounced(messageId: string): Promise<Email | null> {
	try {
		const result = await db
			.update(emails)
			.set({ emailBounced: true })
			.where(eq(emails.messageId, messageId))
			.returning();
		return result[0] ?? null;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error updating email bounced', error);
		throw error;
	}
}

export async function updateEmailComplained(messageId: string): Promise<Email | null> {
	try {
		const result = await db
			.update(emails)
			.set({ emailComplained: true })
			.where(eq(emails.messageId, messageId))
			.returning();
		return result[0] ?? null;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('Error updating email complained', error);
		throw error;
	}
}
