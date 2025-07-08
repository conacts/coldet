import type { NextRequest } from 'next/server';

interface SESMessage {
	eventType: string;
	mail: {
		messageId: string;
	};
	open?: {
		timestamp: string;
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
		const message = JSON.parse(snsPayload.Message);
		const eventType = message.eventType?.toLowerCase();
		const messageId = message.mail?.messageId;

		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.log(`🔥 OUTBOUND WEBHOOK TRIGGERED - ${new Date().toISOString()}`);
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.log(`📧 Message ID: ${messageId}`);
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.log(`📋 Event Type: ${eventType}`);

		switch (eventType) {
			case 'open':
				handleOpenEvent(message, messageId);
				break;
			case 'click':
				handleClickEvent(message, messageId);
				break;
			case 'bounce':
				handleBounceEvent(message, messageId);
				break;
			case 'complaint':
				handleComplaintEvent(message, messageId);
				break;
			case 'send':
			case 'delivery':
				// Log but don't need special handling for send/delivery events
				// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
				console.log(`✅ ${eventType.toUpperCase()} event logged for ${messageId}`);
				break;
			default:
				// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
				console.log(`❓ Unknown event type: ${eventType}`);
		}

		return new Response('Outbound email webhook processed', { status: 200 });
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
		console.error('❌ OUTBOUND WEBHOOK ERROR:', error);
		return new Response('Error processing webhook', { status: 500 });
	}
}

function handleOpenEvent(message: SESMessage, messageId: string) {
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`👀 EMAIL OPENED - ${messageId}`);
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`🕐 Opened at: ${message.open?.timestamp}`);
	// TODO: Update database to mark email as opened
}

function handleClickEvent(message: SESMessage, messageId: string) {
	const clickedLink = message.click?.link;
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`🔗 LINK CLICKED - ${messageId}`);
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`🌐 Clicked Link: ${clickedLink}`);
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`🕐 Clicked at: ${message.click?.timestamp}`);
	// TODO: Update database to mark email as clicked
}

function handleBounceEvent(message: SESMessage, messageId: string) {
	const bounceType = message.bounce?.bounceType;
	const bounceSubType = message.bounce?.bounceSubType;
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`💥 EMAIL BOUNCED - ${messageId}`);
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`📋 Bounce Type: ${bounceType} (${bounceSubType})`);
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`🕐 Bounced at: ${message.bounce?.timestamp}`);
	// TODO: Update database to mark email as bounced
}

function handleComplaintEvent(message: SESMessage, messageId: string) {
	const complaintType = message.complaint?.complaintFeedbackType;
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`😡 SPAM COMPLAINT - ${messageId}`);
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`📋 Complaint Type: ${complaintType}`);
	// biome-ignore lint/suspicious/noConsole: Debug logging for webhook testing
	console.log(`🕐 Complained at: ${message.complaint?.timestamp}`);
	// TODO: Update database to mark email as complained
} 