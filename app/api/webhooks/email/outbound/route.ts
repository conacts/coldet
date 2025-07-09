import type { NextRequest } from 'next/server';
import {
	updateEmailBounced,
	updateEmailClicked,
	updateEmailComplained,
	updateEmailOpened,
} from '@/lib/db/emails';
import type { SesMessage, SnsNotification } from '@/types/aws-ses';

export async function POST(request: NextRequest) {
	try {
		const snsPayload: SnsNotification = await request.json();
		const messageId = snsPayload.MessageId;
		const message: SesMessage = JSON.parse(snsPayload.Message);
		const eventType = message.eventType?.toLowerCase();

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
				// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
				console.log('Send event logged');
				break;
			case 'delivery':
				// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
				console.log('Delivery event logged');
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
		await updateEmailOpened(messageId);
	} catch (error) {
		throw new Error(`Failed to update email opened status: ${error}`);
	}
}

async function handleClickEvent(messageId: string): Promise<void> {
	try {
		await updateEmailClicked(messageId);
	} catch (error) {
		throw new Error(`Failed to update email clicked status: ${error}`);
	}
}

async function handleBounceEvent(messageId: string): Promise<void> {
	try {
		await updateEmailBounced(messageId);
	} catch (error) {
		throw new Error(`Failed to update email bounced status: ${error}`);
	}
}

async function handleComplaintEvent(messageId: string): Promise<void> {
	try {
		await updateEmailComplained(messageId);
	} catch (error) {
		throw new Error(`Failed to update email complained status: ${error}`);
	}
}
