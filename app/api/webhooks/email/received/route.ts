import type { NextRequest } from 'next/server';
import { handleReceivedEmail } from '@/lib/email';
import type { SesSnsNotification } from '@/types/aws-ses';

export async function POST(request: NextRequest) {
	const snsPayload = await request.json();
	console.log(snsPayload);
	try {
		const sesMessage = JSON.parse(snsPayload.Message) as SesSnsNotification;
		if (sesMessage.notificationType !== 'Received') {
			return new Response('Not a received email event', { status: 204 });
		}
		await handleReceivedEmail(sesMessage);
		return new Response('Received email webhook', { status: 200 });
	} catch (error) {
		console.error('Error handling received email', error);
		return new Response('Invalid SES SNS payload', { status: 400 });
	}
}
