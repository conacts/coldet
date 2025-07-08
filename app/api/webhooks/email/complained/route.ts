import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	const snsPayload = await request.json();
	console.log(snsPayload);
	// Handle email complaint event here
	return new Response('Email complaint webhook', { status: 200 });
} 