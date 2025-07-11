import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type CreateAiUsageLogParams,
	createAiUsageLog,
	deleteAiUsageLogsByDateRange,
	deleteAiUsageLogsByOrganizationId,
	getAiUsageLogsByCollectorId,
	getAiUsageLogsByDateRange,
	getAiUsageLogsByOrganizationId,
	getAiUsageLogsByUsageType,
	getAiUsageLogsByUserId,
} from '@/lib/db/ai-usage-logs';
import {
	type CreateCollectorParams,
	createCollector,
} from '@/lib/db/collectors';
import {
	type CreateOrganizationParams,
	createOrganization,
} from '@/lib/db/organizations';
import { type CreateUserParams, createUser } from '@/lib/db/users';
import { clearTables, createTestDb } from '../setup-db';

// Mock the db import to use our test database
let testDb: Awaited<ReturnType<typeof createTestDb>>['db'];
let client: PGlite;

vi.mock('@/lib/db/client', () => ({
	db: new Proxy(
		{},
		{
			get: (_target, prop) => {
				return testDb[prop as keyof typeof testDb];
			},
		}
	),
}));

describe('AI Usage Logs Database Operations', () => {
	let testUserId: string;
	let testOrganizationId: string;
	let testCollectorId: string;

	beforeEach(async () => {
		const testSetup = await createTestDb();
		testDb = testSetup.db;
		client = testSetup.client;
		await clearTables(client);

		// Create test organization
		const orgParams: CreateOrganizationParams = {
			name: 'Test Organization',
		};
		const org = await createOrganization(orgParams);
		testOrganizationId = org.id;

		// Create test user
		const userParams: CreateUserParams = {
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			password: 'password',
		};
		const user = await createUser(userParams);
		testUserId = user.id;

		// Create test collector
		const collectorParams: CreateCollectorParams = {
			organizationId: testOrganizationId,
			userId: testUserId,
			name: 'Test Collector',
			systemPrompt: 'Test system prompt.',
		};
		const collector = await createCollector(collectorParams);
		testCollectorId = collector.id;
	});

	describe('createAiUsageLog', () => {
		it('should create AI usage log with valid data', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				collectorId: testCollectorId,
				usageType: 'email_generation',
				model: 'gpt-4o-mini',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
				metadata: { emailId: 'test-email-123' },
			};

			const result = await createAiUsageLog(logParams);

			expect(result.organizationId).toBe(testOrganizationId);
			expect(result.userId).toBe(testUserId);
			expect(result.collectorId).toBe(testCollectorId);
			expect(result.usageType).toBe('email_generation');
			expect(result.model).toBe('gpt-4o-mini');
			expect(result.promptTokens).toBe(100);
			expect(result.completionTokens).toBe(50);
			expect(result.totalTokens).toBe(150);
			expect(result.costCents).toBe(5);
			expect(result.metadata).toEqual({ emailId: 'test-email-123' });
			expect(result.id).toBeTruthy();
			expect(result.createdAt).toBeTruthy();
		});

		it('should create AI usage log without collector', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_analysis',
				model: 'gpt-3.5-turbo',
				promptTokens: 200,
				completionTokens: 100,
				totalTokens: 300,
				costCents: 3,
			};

			const result = await createAiUsageLog(logParams);

			expect(result.collectorId).toBeNull();
			expect(result.usageType).toBe('email_analysis');
		});

		it('should create AI usage log with minimal data', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'other',
				model: 'gpt-4',
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				costCents: 0,
			};

			const result = await createAiUsageLog(logParams);

			expect(result.promptTokens).toBe(0);
			expect(result.completionTokens).toBe(0);
			expect(result.totalTokens).toBe(0);
			expect(result.costCents).toBe(0);
			expect(result.metadata).toBeNull();
		});
	});

	describe('getAiUsageLogsByOrganizationId', () => {
		it('should return all usage logs for organization', async () => {
			const log1Params: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			const log2Params: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_analysis',
				model: 'gpt-3.5-turbo',
				promptTokens: 200,
				completionTokens: 100,
				totalTokens: 300,
				costCents: 3,
			};

			await createAiUsageLog(log1Params);
			await createAiUsageLog(log2Params);

			const result = await getAiUsageLogsByOrganizationId(testOrganizationId);
			expect(result).toHaveLength(2);
		});

		it('should return limited results when limit specified', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			await createAiUsageLog(logParams);
			await createAiUsageLog(logParams);
			await createAiUsageLog(logParams);

			const result = await getAiUsageLogsByOrganizationId(
				testOrganizationId,
				2
			);
			expect(result).toHaveLength(2);
		});
	});

	describe('getAiUsageLogsByUserId', () => {
		it('should return all usage logs for user', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			await createAiUsageLog(logParams);
			await createAiUsageLog(logParams);

			const result = await getAiUsageLogsByUserId(testUserId);
			expect(result).toHaveLength(2);
		});
	});

	describe('getAiUsageLogsByCollectorId', () => {
		it('should return all usage logs for collector', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				collectorId: testCollectorId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			await createAiUsageLog(logParams);
			await createAiUsageLog(logParams);

			const result = await getAiUsageLogsByCollectorId(testCollectorId);
			expect(result).toHaveLength(2);
		});
	});

	describe('getAiUsageLogsByDateRange', () => {
		it('should return logs within date range', async () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			await createAiUsageLog(logParams);

			const result = await getAiUsageLogsByDateRange(
				testOrganizationId,
				yesterday,
				tomorrow
			);
			expect(result).toHaveLength(1);
		});

		it('should return empty array for date range with no logs', async () => {
			const pastDate1 = new Date('2020-01-01');
			const pastDate2 = new Date('2020-01-02');

			const result = await getAiUsageLogsByDateRange(
				testOrganizationId,
				pastDate1,
				pastDate2
			);
			expect(result).toHaveLength(0);
		});
	});

	describe('getAiUsageLogsByUsageType', () => {
		it('should return logs for specific usage type', async () => {
			const emailGenParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			const emailAnalysisParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_analysis',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			await createAiUsageLog(emailGenParams);
			await createAiUsageLog(emailAnalysisParams);
			await createAiUsageLog(emailGenParams);

			const result = await getAiUsageLogsByUsageType(
				testOrganizationId,
				'email_generation'
			);
			expect(result).toHaveLength(2);
		});
	});

	describe('deleteAiUsageLogsByOrganizationId', () => {
		it('should delete all AI usage logs for organization', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			await createAiUsageLog(logParams);
			await createAiUsageLog(logParams);

			await deleteAiUsageLogsByOrganizationId(testOrganizationId);

			const result = await getAiUsageLogsByOrganizationId(testOrganizationId);
			expect(result).toHaveLength(0);
		});
	});

	describe('deleteAiUsageLogsByDateRange', () => {
		it('should delete AI usage logs within date range', async () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			await createAiUsageLog(logParams);

			await deleteAiUsageLogsByDateRange(
				testOrganizationId,
				yesterday,
				tomorrow
			);

			const result = await getAiUsageLogsByOrganizationId(testOrganizationId);
			expect(result).toHaveLength(0);
		});
	});

	describe('Edge cases and data integrity', () => {
		it('should handle various usage types', async () => {
			const usageTypes = ['email_generation', 'email_analysis', 'other'];

			for (const usageType of usageTypes) {
				const logParams: CreateAiUsageLogParams = {
					organizationId: testOrganizationId,
					userId: testUserId,
					usageType,
					model: 'gpt-4',
					promptTokens: 100,
					completionTokens: 50,
					totalTokens: 150,
					costCents: 5,
				};

				const result = await createAiUsageLog(logParams);
				expect(result.usageType).toBe(usageType);
			}
		});

		it('should handle various models', async () => {
			const models = [
				'gpt-4',
				'gpt-4o-mini',
				'gpt-3.5-turbo',
				'claude-3-haiku',
			];

			for (const model of models) {
				const logParams: CreateAiUsageLogParams = {
					organizationId: testOrganizationId,
					userId: testUserId,
					usageType: 'email_generation',
					model,
					promptTokens: 100,
					completionTokens: 50,
					totalTokens: 150,
					costCents: 5,
				};

				const result = await createAiUsageLog(logParams);
				expect(result.model).toBe(model);
			}
		});

		it('should handle complex metadata', async () => {
			const complexMetadata = {
				emailId: 'test-email-123',
				threadId: 'thread-456',
				debtorId: 'debtor-789',
				features: ['reply', 'escalation'],
				timing: {
					startTime: '2024-01-01T10:00:00Z',
					endTime: '2024-01-01T10:01:00Z',
					duration: 60_000,
				},
			};

			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
				metadata: complexMetadata,
			};

			const result = await createAiUsageLog(logParams);
			expect(result.metadata).toEqual(complexMetadata);
		});

		it('should maintain referential integrity', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				collectorId: testCollectorId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100,
				completionTokens: 50,
				totalTokens: 150,
				costCents: 5,
			};

			const result = await createAiUsageLog(logParams);
			expect(result.organizationId).toBe(testOrganizationId);
			expect(result.userId).toBe(testUserId);
			expect(result.collectorId).toBe(testCollectorId);
		});

		it('should handle large token counts', async () => {
			const logParams: CreateAiUsageLogParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				usageType: 'email_generation',
				model: 'gpt-4',
				promptTokens: 100_000,
				completionTokens: 50_000,
				totalTokens: 150_000,
				costCents: 5000,
			};

			const result = await createAiUsageLog(logParams);
			expect(result.promptTokens).toBe(100_000);
			expect(result.completionTokens).toBe(50_000);
			expect(result.totalTokens).toBe(150_000);
			expect(result.costCents).toBe(5000);
		});
	});
});
