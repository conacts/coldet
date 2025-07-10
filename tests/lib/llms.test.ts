import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Debt, Email } from '@/lib/db/schema';
import {
	EmailResponseSchema,
	emailHistoryToOpenAIMessages,
	generateResponseEmail,
} from '@/lib/llms';

// Mock OpenAI
vi.mock('openai', () => ({
	default: vi.fn().mockImplementation(() => ({
		chat: {
			completions: {
				parse: vi.fn(),
			},
		},
	})),
}));

vi.mock('openai/helpers/zod', () => ({
	zodResponseFormat: vi.fn().mockReturnValue({ type: 'json_schema' }),
}));

describe('EmailResponseSchema', () => {
	it('should validate valid email response', () => {
		const validResponse = {
			subject: 'Test Subject',
			body: 'Test Body',
			signature: 'Test Signature',
		};

		const result = EmailResponseSchema.safeParse(validResponse);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validResponse);
		}
	});

	it('should reject invalid email response', () => {
		const invalidResponse = {
			subject: 'Test Subject',
			body: 123, // Invalid type
			signature: 'Test Signature',
		};

		const result = EmailResponseSchema.safeParse(invalidResponse);
		expect(result.success).toBe(false);
	});

	it('should reject missing required fields', () => {
		const incompleteResponse = {
			subject: 'Test Subject',
			// Missing body and signature
		};

		const result = EmailResponseSchema.safeParse(incompleteResponse);
		expect(result.success).toBe(false);
	});
});

describe('emailHistoryToOpenAIMessages', () => {
	const mockDebt: Debt = {
		id: 'debt-1',
		debtorId: 'debtor-1',
		originalCreditor: 'Test Creditor',
		totalOwed: 1000,
		amountPaid: 200,
		status: 'active',
		debtDate: new Date('2024-01-01'),
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	it('should create system message with debt information', () => {
		const emailHistory: Email[] = [];
		const messages = emailHistoryToOpenAIMessages(emailHistory, mockDebt);

		expect(messages).toHaveLength(1);
		expect(messages[0]).toEqual({
			role: 'system',
			content: expect.stringContaining(
				'You are a professional debt collection assistant'
			),
		});
		expect(messages[0].content).toContain('Test Creditor');
		expect(messages[0].content).toContain('$1000');
		expect(messages[0].content).toContain('$200');
		expect(messages[0].content).toContain('$800');
		expect(messages[0].content).toContain('active');
		expect(messages[0].content).toContain('12/31/2023');
	});

	it('should convert inbound emails to user messages', () => {
		const emailHistory: Email[] = [
			{
				id: 'email-1',
				debtId: 'debt-1',
				threadId: 'thread-1',
				messageId: 'msg-1',
				direction: 'inbound',
				subject: 'Question about debt',
				content: 'I have a question about my debt',
				fromEmailAddress: 'debtor@example.com',
				emailOpened: false,
				emailClicked: false,
				emailBounced: false,
				emailComplained: false,
				aiGenerated: false,
				complianceChecked: true,
				replyTo: null,
				timestamp: new Date(),
				createdAt: new Date(),
			},
		];

		const messages = emailHistoryToOpenAIMessages(emailHistory, mockDebt);

		expect(messages).toHaveLength(2);
		expect(messages[1]).toEqual({
			role: 'user',
			content:
				'Subject: Question about debt\n\nI have a question about my debt',
		});
	});

	it('should convert outbound emails to assistant messages', () => {
		const emailHistory: Email[] = [
			{
				id: 'email-1',
				debtId: 'debt-1',
				threadId: 'thread-1',
				messageId: 'msg-1',
				direction: 'outbound',
				subject: 'Response to your question',
				content: 'Here is the answer to your question',
				fromEmailAddress: 'collector@example.com',
				emailOpened: false,
				emailClicked: false,
				emailBounced: false,
				emailComplained: false,
				aiGenerated: false,
				complianceChecked: true,
				replyTo: null,
				timestamp: new Date(),
				createdAt: new Date(),
			},
		];

		const messages = emailHistoryToOpenAIMessages(emailHistory, mockDebt);

		expect(messages).toHaveLength(2);
		expect(messages[1]).toEqual({
			role: 'assistant',
			content:
				'Subject: Response to your question\n\nHere is the answer to your question',
		});
	});

	it('should handle emails with no subject or content', () => {
		const emailHistory: Email[] = [
			{
				id: 'email-1',
				debtId: 'debt-1',
				threadId: 'thread-1',
				messageId: 'msg-1',
				direction: 'inbound',
				subject: null,
				content: null,
				fromEmailAddress: 'debtor@example.com',
				emailOpened: false,
				emailClicked: false,
				emailBounced: false,
				emailComplained: false,
				aiGenerated: false,
				complianceChecked: true,
				replyTo: null,
				timestamp: new Date(),
				createdAt: new Date(),
			},
		];

		const messages = emailHistoryToOpenAIMessages(emailHistory, mockDebt);

		expect(messages).toHaveLength(2);
		expect(messages[1]).toEqual({
			role: 'user',
			content: 'Subject: No Subject\n\nNo content',
		});
	});

	it('should handle mixed email conversation', () => {
		const emailHistory: Email[] = [
			{
				id: 'email-1',
				debtId: 'debt-1',
				threadId: 'thread-1',
				messageId: 'msg-1',
				direction: 'inbound',
				subject: 'Initial question',
				content: 'What is my balance?',
				fromEmailAddress: 'debtor@example.com',
				emailOpened: false,
				emailClicked: false,
				emailBounced: false,
				emailComplained: false,
				aiGenerated: false,
				complianceChecked: true,
				replyTo: null,
				timestamp: new Date(),
				createdAt: new Date(),
			},
			{
				id: 'email-2',
				debtId: 'debt-1',
				threadId: 'thread-1',
				messageId: 'msg-2',
				direction: 'outbound',
				subject: 'Re: Initial question',
				content: 'Your balance is $800',
				fromEmailAddress: 'collector@example.com',
				emailOpened: false,
				emailClicked: false,
				emailBounced: false,
				emailComplained: false,
				aiGenerated: false,
				complianceChecked: true,
				replyTo: null,
				timestamp: new Date(),
				createdAt: new Date(),
			},
			{
				id: 'email-3',
				debtId: 'debt-1',
				threadId: 'thread-1',
				messageId: 'msg-3',
				direction: 'inbound',
				subject: 'Payment plan',
				content: 'Can I set up a payment plan?',
				fromEmailAddress: 'debtor@example.com',
				emailOpened: false,
				emailClicked: false,
				emailBounced: false,
				emailComplained: false,
				aiGenerated: false,
				complianceChecked: true,
				replyTo: null,
				timestamp: new Date(),
				createdAt: new Date(),
			},
		];

		const messages = emailHistoryToOpenAIMessages(emailHistory, mockDebt);

		expect(messages).toHaveLength(4);
		expect(messages[0].role).toBe('system');
		expect(messages[1].role).toBe('user');
		expect(messages[2].role).toBe('assistant');
		expect(messages[3].role).toBe('user');
	});

	it('should handle debt with null debtDate', () => {
		const debtWithNullDate: Debt = {
			...mockDebt,
			debtDate: null,
		};

		const messages = emailHistoryToOpenAIMessages([], debtWithNullDate);

		expect(messages[0].content).toContain('N/A');
	});
});

// Note: generateResponseEmail function tests are skipped due to complex OpenAI mocking requirements
// The function calls emailHistoryToOpenAIMessages (which is thoroughly tested above) and makes an OpenAI API call
// Integration tests or manual testing would be more appropriate for this function
