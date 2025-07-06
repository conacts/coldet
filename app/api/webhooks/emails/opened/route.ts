import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	// Parse SES open event notification to use await
	await request.json();
	// Handle email opened event here
	return new Response('Email opened webhook', { status: 200 });
} 