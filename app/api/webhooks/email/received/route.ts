import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	const snsPayload = await request.json();
	const sesMessage = JSON.parse(snsPayload.Message);
	console.log(sesMessage);
	console.log(snsPayload);

	// Example: get sender and subject
	const sender = sesMessage.mail.source;
	const subject = sesMessage.mail.commonHeaders.subject;

	console.log(sender);
	console.log(subject);

	return new Response('ok', { status: 200 });

} 