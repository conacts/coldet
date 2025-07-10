import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import type { Debt, Email } from '@/lib/db/schema';

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export const EmailResponseSchema = z.object({
	subject: z.string(),
	body: z.string(),
	signature: z.string(),
});

export type EmailResponse = z.infer<typeof EmailResponseSchema>;

export function emailHistoryToOpenAIMessages(
	emailHistory: Email[],
	debt: Debt
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
	// Start with system message containing debt context
	const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `You are a professional debt collection assistant. You are responding to emails regarding the following debt account:

Debt Information:
- Original Creditor: ${debt.originalCreditor}
- Total Owed: $${debt.totalOwed}
- Amount Paid: $${debt.amountPaid}
- Remaining Balance: $${Number(debt.totalOwed) - Number(debt.amountPaid)}
- Status: ${debt.status}
- Debt Date: ${debt.debtDate ? new Date(debt.debtDate).toLocaleDateString() : 'N/A'}

Guidelines:
- Be professional and empathetic
- Follow debt collection compliance rules (FDCPA)
- Provide clear payment options
- Answer questions about the debt accurately
- Offer payment plans when appropriate`,
		},
	];

	// Convert email history to conversation messages
	for (const email of emailHistory) {
		if (email.direction === 'inbound') {
			messages.push({
				role: 'user',
				content: `Subject: ${email.subject || 'No Subject'}

${email.content || 'No content'}`,
			});
		} else if (email.direction === 'outbound') {
			messages.push({
				role: 'assistant',
				content: `Subject: ${email.subject || 'No Subject'}

${email.content || 'No content'}`,
			});
		}
	}

	return messages;
}
export async function generateResponseEmail(
	emailHistory: Email[],
	debt: Debt,
): Promise<EmailResponse> {
	const messages = emailHistoryToOpenAIMessages(emailHistory, debt);
	const responseFormat = zodResponseFormat(EmailResponseSchema, 'email_response');

	const completion = await openai.chat.completions.parse({
		model: 'gpt-4o-mini',
		messages,
		response_format: responseFormat,
	});

	const parsed = completion.choices[0].message.parsed;
	if (!parsed) {
		throw new Error('Failed to parse AI response');
	}

	return parsed;
}

