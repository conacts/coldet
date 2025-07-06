import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	// Parse SES bounce event notification to use await
	await request.json();
	// Handle email bounced event here
	return new Response('Email bounced webhook', { status: 200 });
} 