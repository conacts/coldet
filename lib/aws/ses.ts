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
	textBody?: string;
	replyTo?: string;
	messageId?: string;
	inReplyTo?: string;
	references?: string;
}

export async function sendEmail({
	to,
	from,
	subject,
	htmlBody,
	textBody,
	replyTo,
	messageId,
	inReplyTo,
	references,
}: SendEmailParams): Promise<string> {
	const headers: Record<string, string> = {};

	if (messageId) {
		headers['Message-ID'] = messageId;
	}
	if (inReplyTo) {
		headers['In-Reply-To'] = inReplyTo;
	}
	if (references) {
		headers['References'] = references;
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
				...(textBody && {
					Text: {
						Data: textBody,
						Charset: 'UTF-8',
					},
				}),
			},
		},
		ReplyToAddresses: replyTo ? [replyTo] : undefined,
		// Note: AWS SES doesn't directly support custom headers in SendEmailCommand
		// For threading headers, you might need to use SendRawEmailCommand
	});

	try {
		const response = await sesClient.send(command);
		return response.MessageId || '';
	} catch (error) {
		console.error('Failed to send email:', error);
		throw new Error(
			`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

export async function sendRawEmail({
	to,
	from,
	subject,
	htmlBody,
	textBody,
	replyTo,
	messageId,
	inReplyTo,
	references,
}: SendEmailParams): Promise<string> {
	// Build raw email with proper headers for threading
	const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`;

	let rawMessage = `From: ${from}\r\n`;
	rawMessage += `To: ${to}\r\n`;
	rawMessage += `Subject: ${subject}\r\n`;

	if (replyTo) {
		rawMessage += `Reply-To: ${replyTo}\r\n`;
	}
	if (messageId) {
		rawMessage += `Message-ID: ${messageId}\r\n`;
	}
	if (inReplyTo) {
		rawMessage += `In-Reply-To: ${inReplyTo}\r\n`;
	}
	if (references) {
		rawMessage += `References: ${references}\r\n`;
	}

	rawMessage += 'MIME-Version: 1.0\r\n';
	rawMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

	if (textBody) {
		rawMessage += `--${boundary}\r\n`;
		rawMessage += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
		rawMessage += `${textBody}\r\n\r\n`;
	}

	rawMessage += `--${boundary}\r\n`;
	rawMessage += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
	rawMessage += `${htmlBody}\r\n\r\n`;
	rawMessage += `--${boundary}--\r\n`;

	const { SendRawEmailCommand } = await import('@aws-sdk/client-ses');
	const command = new SendRawEmailCommand({
		RawMessage: {
			Data: Buffer.from(rawMessage),
		},
	});

	try {
		const response = await sesClient.send(command);
		return response.MessageId || '';
	} catch (error) {
		console.error('Failed to send raw email:', error);
		throw new Error(
			`Failed to send raw email: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}
