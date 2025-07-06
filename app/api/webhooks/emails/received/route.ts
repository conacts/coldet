import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	// Parse SES inbound email notification to use await
	const body = await request.json();
	console.log(body);
	// Handle received email event here
	return new Response('Received email webhook', { status: 200 });
} 