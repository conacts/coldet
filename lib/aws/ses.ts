import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

if (!process.env.AWS_ACCESS_KEY_ID) {
	throw new Error('AWS_ACCESS_KEY_ID is not set');
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
	throw new Error('AWS_SECRET_ACCESS_KEY is not set');
}
if (!process.env.AWS_REGION) {
	throw new Error('AWS_REGION is not set');
}

const sesClient = new SESClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},
});

export interface SendEmailParams {
	to: string;
	from: string;
	subject: string;
	htmlBody: string;
	replyTo?: string;
	inReplyToMessageId?: string;
	references?: string;
	configurationSetName?: string;
}

export async function sendEmail({
	to,
	from,
	subject,
	htmlBody,
	replyTo,
	inReplyToMessageId,
	references,
	configurationSetName,
}: SendEmailParams): Promise<string> {
	// Email threading headers - these maintain conversation continuity
	const headers: Record<string, string> = {};

	// Note: AWS SES automatically generates its own Message-ID and ignores custom ones

	if (inReplyToMessageId) {
		// In-Reply-To: The Message-ID of the email THIS email is replying to (immediate parent)
		// This creates the parent-child relationship in the email thread
		// When someone replies to our email, their In-Reply-To will contain our Message-ID
		headers['In-Reply-To'] = inReplyToMessageId;
	}
	if (references) {
		// References: Complete chronological list of ALL Message-IDs in this thread
		// Format: <msg1@domain> <msg2@domain> <msg3@domain> (space-separated)
		// This provides the full thread context and helps email clients group conversations
		headers.References = references;
	}

	const command = new SendEmailCommand({
		Source: from,
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Subject: {
				Data: subject,
				Charset: 'UTF-8',
			},
			Body: {
				Html: {
					Data: htmlBody,
					Charset: 'UTF-8',
				},
			},
		},
		ReplyToAddresses: replyTo ? [replyTo] : undefined,
		ConfigurationSetName: configurationSetName,
	});

	try {
		const response = await sesClient.send(command);
		if (!response.MessageId) {
			throw new Error('Failed to send email. No MessageId returned.');
		}

		console.log(response)

		console.log('sendEmail: MessageId', response.MessageId);
		return response.MessageId;
	} catch (error) {
		throw new Error(
			`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Send a reply email with proper threading headers
 * Note: AWS SES doesn't directly support In-Reply-To/References headers in the API.
 * Threading is handled by using consistent subjects and reply-to addresses.
 */
export async function sendReplyEmail({
	to,
	from,
	subject,
	htmlBody,
	textBody,
	configurationSetName,
}: {
	to: string;
	from: string;
	subject: string;
	htmlBody?: string;
	textBody?: string;
	configurationSetName?: string;
}): Promise<string> {
	// For replies, ensure subject has "Re:" prefix if not already present
	// Is this necessary?
	const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

	const command = new SendEmailCommand({
		Source: from,
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Subject: {
				Data: replySubject,
				Charset: 'UTF-8',
			},
			Body: {
				Html: htmlBody
					? {
						Data: htmlBody,
						Charset: 'UTF-8',
					}
					: undefined,
				Text: textBody
					? {
						Data: textBody,
						Charset: 'UTF-8',
					}
					: undefined,
			},
		},
		ConfigurationSetName: configurationSetName,
	});

	try {
		const response = await sesClient.send(command);
		if (!response.MessageId) {
			throw new Error('Failed to send reply email - no MessageId returned');
		}

		return response.MessageId;
	} catch (error) {
		throw new Error(
			`Failed to send reply email: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}