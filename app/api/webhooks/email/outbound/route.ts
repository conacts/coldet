import type { NextRequest } from 'next/server';
import {
	updateEmailBounced,
	updateEmailClicked,
	updateEmailComplained,
	updateEmailOpened,
} from '@/lib/db/emails';

interface SESMessage {
	eventType: string;
	mail: {
		messageId: string;
	};
	open?: {
		timestamp: string;
		userAgent: string;
		ipAddress: string;
	};
	click?: {
		link: string;
		timestamp: string;
	};
	bounce?: {
		bounceType: string;
		bounceSubType: string;
		timestamp: string;
	};
	complaint?: {
		complaintFeedbackType: string;
		timestamp: string;
	};
}

export async function POST(request: NextRequest) {
	try {
		const snsPayload = await request.json();
		const message: SESMessage = JSON.parse(snsPayload.Message);
		const eventType = message.eventType?.toLowerCase();
		const messageId = message.mail?.messageId;

		switch (eventType) {
			case 'open':
				await handleOpenEvent(messageId);
				break;
			case 'click':
				await handleClickEvent(messageId);
				break;
			case 'bounce':
				await handleBounceEvent(messageId);
				break;
			case 'complaint':
				await handleComplaintEvent(messageId);
				break;
			case 'send':
			case 'delivery':
				// Log but don't need special handling for send/delivery events
				// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
				console.log(
					`✅ ${eventType.toUpperCase()} event logged for ${messageId}`
				);
				break;
			default:
				// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
				console.error(`❓ Unknown event type: ${eventType}`);
		}

		return new Response('Outbound email webhook processed', { status: 200 });
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('❌ OUTBOUND WEBHOOK ERROR:', error);
		return new Response('Error processing webhook', { status: 500 });
	}
}

async function handleOpenEvent(messageId: string): Promise<void> {
	try {
		const updatedEmail = await updateEmailOpened(messageId);
		if (!updatedEmail) {
			throw new Error(`Email not found in database for messageId: ${messageId}`);
		}
	} catch (error) {
		throw new Error(`Failed to update email opened status: ${error}`);
	}
}

async function handleClickEvent(messageId: string): Promise<void> {
	try {
		const updatedEmail = await updateEmailClicked(messageId);
		if (!updatedEmail) {
			throw new Error(`Email not found in database for messageId: ${messageId}`);
		}
	} catch (error) {
		throw new Error(`Failed to update email clicked status: ${error}`);
	}
}

async function handleBounceEvent(messageId: string): Promise<void> {
	try {
		const updatedEmail = await updateEmailBounced(messageId);
		if (!updatedEmail) {
			throw new Error(`Email not found in database for messageId: ${messageId}`);
		}
	} catch (error) {
		throw new Error(`Failed to update email bounced status: ${error}`);
	}
}

async function handleComplaintEvent(messageId: string): Promise<void> {
	try {
		const updatedEmail = await updateEmailComplained(messageId);
		if (!updatedEmail) {
			throw new Error(`Email not found in database for messageId: ${messageId}`);
		}
	} catch (error) {
		throw new Error(`Failed to update email complained status: ${error}`);
	}
}
