import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	// Parse SES complaint event notification to use await
	await request.json();
	// Handle email complaint event here
	return new Response('Email complaint webhook', { status: 200 });
} 