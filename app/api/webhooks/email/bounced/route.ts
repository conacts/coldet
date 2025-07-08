import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	const snsPayload = await request.json();
	console.log(snsPayload);
	// Handle email bounced event here
	return new Response('Email bounced webhook', { status: 200 });
} 