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
	configurationSetName?: string;
}

export async function sendEmail({
	to,
	from,
	subject,
	htmlBody,
	replyTo,
	configurationSetName,
}: SendEmailParams): Promise<string> {
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

		return response.MessageId;
	} catch (error) {
		throw new Error(
			`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}
