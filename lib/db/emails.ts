import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { Email } from '@/lib/db/schema';
import { emails } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';

export async function createEmail({
	debtId,
	threadId,
	messageId = generateUUID(),
	direction,
	subject,
	content,
	emailOpened = false,
	emailClicked = false,
	aiGenerated = false,
	complianceChecked = true,
}: {
	debtId: string;
	threadId: string;
	messageId: string;
	direction: 'inbound' | 'outbound';
	subject?: string | null;
	content?: string | null;
	emailOpened?: boolean;
	emailClicked?: boolean;
	aiGenerated?: boolean;
	complianceChecked?: boolean;
}): Promise<Email> {
	const [email] = await db
		.insert(emails)
		.values({
			debtId,
			threadId,
			messageId,
			direction,
			subject,
			content,
			emailOpened,
			emailClicked,
			aiGenerated,
			complianceChecked,
		})
		.returning();
	return email;
}

export async function getEmailById(id: string): Promise<Email | null> {
	const result = await db.select().from(emails).where(eq(emails.id, id)).limit(1);
	return result[0] ?? null;
}

export async function getEmailByMessageId(messageId: string): Promise<Email | null> {
	const result = await db.select().from(emails).where(eq(emails.messageId, messageId)).limit(1);
	return result[0] ?? null;
}
