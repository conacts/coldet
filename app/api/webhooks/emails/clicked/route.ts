import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	// Parse SES click event notification to use await
	await request.json();
	// Handle email clicked event here
	return new Response('Email clicked webhook', { status: 200 });
} 