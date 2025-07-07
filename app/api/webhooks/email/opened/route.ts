import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	const snsPayload = await request.json();
	console.log(snsPayload);

	return new Response('Email opened webhook', { status: 200 });
} 