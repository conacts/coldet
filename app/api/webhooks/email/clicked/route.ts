import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	const snsPayload = await request.json();
	console.log(snsPayload);
	// Handle email clicked event here
	return new Response('Email clicked webhook', { status: 200 });
} 