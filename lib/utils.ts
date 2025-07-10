import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * Extracts the messageId from an email header value like In-Reply-To or References
 * @param emailHeader - Header value like "<010f0197ec379e7d-224bd427-ed93-4592-93b8-d6440b6ef347-000000@us-east-2.amazonses.com>"
 * @returns The messageId part: "010f0197ec379e7d-224bd427-ed93-4592-93b8-d6440b6ef347-000000"
 */

// TODO: delete this shit
export function extractMessageIdFromEmailHeader(emailHeader: string): string | null {
	if (!emailHeader || typeof emailHeader !== 'string') {
		return null;
	}

	// Remove angle brackets if present
	const cleaned = emailHeader.replace(/^<|>$/g, '');

	// Split by @ and take the first part (messageId)
	const parts = cleaned.split('@');
	if (parts.length < 2) {
		return null;
	}

	const messageId = parts[0];

	// Basic validation - messageId should not be empty
	if (!messageId || messageId.trim() === '') {
		return null;
	}

	return messageId;
}