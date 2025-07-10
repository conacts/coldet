import { vi } from 'vitest';

// Mock React for JSX components
global.React = {
	createElement: vi.fn(),
	Fragment: vi.fn(),
} as any;

// Mock environment variables
process.env.FROM_EMAIL = 'test@example.com';
process.env.AWS_REGION = 'us-east-1';

// Global test mocks
export const mockEmail = {
	id: 'test-email-id',
	messageId: 'test-message-id',
	subject: 'Test Subject',
	body: 'Test email body content',
	direction: 'inbound' as const,
	status: 'received' as const,
	debtId: 'test-debt-id',
	threadId: 'test-thread-id',
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
};

export const mockDebtor = {
	id: 'test-debtor-id',
	debtorId: 'test-debtor-id', // This is the key property that was missing
	firstName: 'John',
	lastName: 'Doe',
	email: 'john.doe@example.com',
	phone: '555-0123',
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
};

export const mockDebt = {
	id: 'test-debt-id',
	debtorId: 'test-debtor-id',
	amount: 1000.00,
	status: 'active' as const,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
};

export const mockEmailThread = {
	id: 'test-thread-id',
	debtorId: 'test-debtor-id',
	subject: 'Test Thread Subject',
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
}; 