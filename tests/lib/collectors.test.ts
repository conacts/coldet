import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	activateCollector,
	type CreateCollectorParams,
	createCollector,
	deactivateCollector,
	deleteCollector,
	getActiveCollectorsByUserId,
	getAllActiveCollectors,
	getCollectorById,
	getCollectorByName,
	getCollectorsByUserId,
	updateCollector,
	updateCollectorCapabilities,
	updateCollectorConfig,
	updateCollectorPrompt,
} from '@/lib/db/collectors';
import { type CreateUserParams, createUser } from '@/lib/db/users';
import {
	clearTables,
	createTestDb,
	createTestPrerequisites,
} from '../setup-db';

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

describe('Collectors Database Operations', () => {
	let testUserId: string;
	let testOrganizationId: string;

	beforeEach(async () => {
		const testSetup = await createTestDb();
		testDb = testSetup.db;
		client = testSetup.client;
		await clearTables(client);

		// Create prerequisite organization and user
		const prerequisites = await createTestPrerequisites();
		testOrganizationId = prerequisites.organizationId;
		testUserId = prerequisites.userId;

		// Create a test user for foreign key relationships
		const userParams: CreateUserParams = {
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
			password: 'password',
		};
		const user = await createUser(userParams);
		testUserId = user.id;
	});

	describe('createCollector', () => {
		it('should create collector with valid data', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Debt Collector AI',
				description: 'A friendly AI collector for debt collection',
				systemPrompt:
					'You are a professional debt collector. Be courteous and helpful.',
				model: 'gpt-4o-mini',
				temperature: 0.7,
				maxTokens: 1000,
				canEscalate: true,
				canReply: true,
				config: { specialty: 'medical_debt' },
				active: true,
			};

			const result = await createCollector(collectorParams);

			expect(result.userId).toBe(testUserId);
			expect(result.name).toBe('Debt Collector AI');
			expect(result.description).toBe(
				'A friendly AI collector for debt collection'
			);
			expect(result.systemPrompt).toBe(
				'You are a professional debt collector. Be courteous and helpful.'
			);
			expect(result.model).toBe('gpt-4o-mini');
			expect(Number(result.temperature)).toBe(0.7);
			expect(result.maxTokens).toBe(1000);
			expect(result.canEscalate).toBe(true);
			expect(result.canReply).toBe(true);
			expect(result.config).toEqual({ specialty: 'medical_debt' });
			expect(result.active).toBe(true);
			expect(result.id).toBeTruthy();
			expect(result.createdAt).toBeTruthy();
			expect(result.updatedAt).toBeTruthy();
		});

		it('should create collector with minimal required data', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Simple Collector',
				systemPrompt: 'You are a debt collector.',
			};

			const result = await createCollector(collectorParams);

			expect(result.userId).toBe(testUserId);
			expect(result.name).toBe('Simple Collector');
			expect(result.systemPrompt).toBe('You are a debt collector.');
			expect(result.description).toBeNull();
			expect(result.model).toBe('gpt-4o-mini');
			expect(Number(result.temperature)).toBe(0.7);
			expect(result.maxTokens).toBe(1000);
			expect(result.canEscalate).toBe(true);
			expect(result.canReply).toBe(true);
			expect(result.config).toBeNull();
			expect(result.active).toBe(true);
		});

		it('should throw error when user does not exist', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Invalid User Collector',
				systemPrompt: 'You are a debt collector.',
			};

			await expect(createCollector(collectorParams)).rejects.toThrow();
		});

		it('should handle different models and configurations', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'GPT-4 Collector',
				systemPrompt: 'You are an advanced debt collector.',
				model: 'gpt-4',
				temperature: 0.5,
				maxTokens: 2000,
				canEscalate: false,
				canReply: true,
				config: {
					specialty: 'credit_card',
					language: 'en',
					tone: 'professional',
				},
			};

			const result = await createCollector(collectorParams);

			expect(result.model).toBe('gpt-4');
			expect(Number(result.temperature)).toBe(0.5);
			expect(result.maxTokens).toBe(2000);
			expect(result.canEscalate).toBe(false);
			expect(result.canReply).toBe(true);
			expect(result.config).toEqual({
				specialty: 'credit_card',
				language: 'en',
				tone: 'professional',
			});
		});
	});

	describe('getCollectorById', () => {
		it('should return collector when found', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Test Collector',
				systemPrompt: 'You are a debt collector.',
			};

			const created = await createCollector(collectorParams);
			const result = await getCollectorById(created.id);

			expect(result?.id).toBe(created.id);
			expect(result?.name).toBe('Test Collector');
		});

		it('should return null when collector not found', async () => {
			const result = await getCollectorById(
				'550e8400-e29b-41d4-a716-446655440000'
			);
			expect(result).toBeNull();
		});
	});

	describe('getCollectorsByUserId', () => {
		it('should return collectors for a user', async () => {
			const collector1Params: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Collector 1',
				systemPrompt: 'You are collector 1.',
			};

			const collector2Params: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Collector 2',
				systemPrompt: 'You are collector 2.',
			};

			await createCollector(collector1Params);
			await createCollector(collector2Params);

			const result = await getCollectorsByUserId(
				testOrganizationId,
				testUserId
			);
			expect(result).toHaveLength(2);
			expect(result.map((c) => c.name)).toContain('Collector 1');
			expect(result.map((c) => c.name)).toContain('Collector 2');
		});

		it('should return empty array when no collectors found', async () => {
			const result = await getCollectorsByUserId(
				testOrganizationId,
				'550e8400-e29b-41d4-a716-446655440000'
			);
			expect(result).toEqual([]);
		});
	});

	describe('getActiveCollectorsByUserId', () => {
		it('should return only active collectors', async () => {
			const activeCollectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Active Collector',
				systemPrompt: 'You are active.',
				active: true,
			};

			const inactiveCollectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Inactive Collector',
				systemPrompt: 'You are inactive.',
				active: false,
			};

			const activeCollector = await createCollector(activeCollectorParams);
			await createCollector(inactiveCollectorParams);

			const result = await getActiveCollectorsByUserId(
				testOrganizationId,
				testUserId
			);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(activeCollector.id);
		});
	});

	describe('updateCollector', () => {
		it('should update collector fields', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Original Name',
				systemPrompt: 'Original prompt.',
				description: 'Original description',
			};

			const created = await createCollector(collectorParams);
			const result = await updateCollector(created.id, {
				name: 'Updated Name',
				description: 'Updated description',
				temperature: 0.8,
			});

			expect(result?.name).toBe('Updated Name');
			expect(result?.description).toBe('Updated description');
			expect(Number(result?.temperature)).toBe(0.8);
			expect(result?.systemPrompt).toBe('Original prompt.'); // Should remain unchanged
		});

		it('should return null when collector not found', async () => {
			const result = await updateCollector(
				'550e8400-e29b-41d4-a716-446655440000',
				{
					name: 'Test',
				}
			);
			expect(result).toBeNull();
		});
	});

	describe('updateCollectorPrompt', () => {
		it('should update system prompt', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Test Collector',
				systemPrompt: 'Original prompt.',
			};

			const created = await createCollector(collectorParams);
			const result = await updateCollectorPrompt(
				created.id,
				'Updated system prompt.'
			);

			expect(result?.systemPrompt).toBe('Updated system prompt.');
		});
	});

	describe('updateCollectorConfig', () => {
		it('should update config', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Test Collector',
				systemPrompt: 'Test prompt.',
				config: { original: 'config' },
			};

			const created = await createCollector(collectorParams);
			const newConfig = { updated: 'config', nested: { value: 123 } };
			const result = await updateCollectorConfig(created.id, newConfig);

			expect(result?.config).toEqual(newConfig);
		});
	});

	describe('deactivateCollector and activateCollector', () => {
		it('should deactivate and reactivate collector', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Test Collector',
				systemPrompt: 'Test prompt.',
			};

			const created = await createCollector(collectorParams);
			expect(created.active).toBe(true);

			const deactivated = await deactivateCollector(created.id);
			expect(deactivated?.active).toBe(false);

			const reactivated = await activateCollector(created.id);
			expect(reactivated?.active).toBe(true);
		});
	});

	describe('deleteCollector', () => {
		it('should delete collector', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Test Collector',
				systemPrompt: 'Test prompt.',
			};

			const created = await createCollector(collectorParams);
			await deleteCollector(created.id);

			const result = await getCollectorById(created.id);
			expect(result).toBeNull();
		});

		it('should not throw error when collector not found', async () => {
			await expect(
				deleteCollector('550e8400-e29b-41d4-a716-446655440000')
			).resolves.not.toThrow();
		});
	});

	describe('getAllActiveCollectors', () => {
		it('should return all active collectors', async () => {
			const collector1Params: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Active Collector 1',
				systemPrompt: 'Active prompt 1.',
			};

			const collector2Params: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Active Collector 2',
				systemPrompt: 'Active prompt 2.',
			};

			const inactiveCollectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Inactive Collector',
				systemPrompt: 'Inactive prompt.',
				active: false,
			};

			await createCollector(collector1Params);
			await createCollector(collector2Params);
			await createCollector(inactiveCollectorParams);

			const result = await getAllActiveCollectors();
			expect(result).toHaveLength(2);
			expect(result.map((c) => c.name)).toContain('Active Collector 1');
			expect(result.map((c) => c.name)).toContain('Active Collector 2');
		});
	});

	describe('getCollectorByName', () => {
		it('should return collector by name', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Unique Collector Name',
				systemPrompt: 'Test prompt.',
			};

			const created = await createCollector(collectorParams);
			const result = await getCollectorByName(
				testOrganizationId,
				'Unique Collector Name'
			);

			expect(result?.id).toBe(created.id);
			expect(result?.name).toBe('Unique Collector Name');
		});

		it('should return null when collector not found', async () => {
			const result = await getCollectorByName(
				testOrganizationId,
				'Non-existent Collector'
			);
			expect(result).toBeNull();
		});
	});

	describe('updateCollectorCapabilities', () => {
		it('should update capabilities', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Test Collector',
				systemPrompt: 'Test prompt.',
				canEscalate: true,
				canReply: true,
			};

			const created = await createCollector(collectorParams);
			const result = await updateCollectorCapabilities(
				created.id,
				false,
				false
			);

			expect(result?.canEscalate).toBe(false);
			expect(result?.canReply).toBe(false);
		});
	});

	describe('Edge cases and data integrity', () => {
		it('should maintain foreign key relationship with users', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'FK Test Collector',
				systemPrompt: 'FK test prompt.',
			};

			const collector = await createCollector(collectorParams);

			// Verify the relationship exists with a join query
			const result = await client.query(
				`
        SELECT c.*, u.first_name, u.last_name 
        FROM collectors c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.id = $1
      `,
				[collector.id]
			);

			expect(result.rows).toHaveLength(1);
			const row = result.rows[0] as { first_name: string; last_name: string };
			expect(row.first_name).toBe('John');
			expect(row.last_name).toBe('Doe');
		});

		it('should handle special characters in names and prompts', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Collector with "Special" Characters & Symbols',
				systemPrompt:
					"You are a professional collector. Use proper grammar, don't be rude.",
				description: 'A collector that handles special cases & edge scenarios.',
			};

			const result = await createCollector(collectorParams);
			expect(result.name).toBe('Collector with "Special" Characters & Symbols');
			expect(result.systemPrompt).toBe(
				"You are a professional collector. Use proper grammar, don't be rude."
			);
			expect(result.description).toBe(
				'A collector that handles special cases & edge scenarios.'
			);
		});

		it('should handle Unicode characters', async () => {
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Cobrador Internacional 🤖',
				systemPrompt: 'Usted es un cobrador profesional. Sea cortés y útil.',
				description: 'Un cobrador que maneja casos en español.',
			};

			const result = await createCollector(collectorParams);
			expect(result.name).toBe('Cobrador Internacional 🤖');
			expect(result.systemPrompt).toBe(
				'Usted es un cobrador profesional. Sea cortés y útil.'
			);
			expect(result.description).toBe(
				'Un cobrador que maneja casos en español.'
			);
		});

		it('should handle complex JSON config', async () => {
			const complexConfig = {
				model_params: {
					temperature: 0.7,
					top_p: 0.9,
					frequency_penalty: 0.1,
				},
				features: {
					email_analysis: true,
					sentiment_detection: true,
					language_detection: true,
				},
				escalation_rules: [
					{ condition: 'angry_customer', action: 'escalate' },
					{ condition: 'payment_promise', action: 'schedule_followup' },
				],
				templates: {
					greeting: 'Hello, I am contacting you regarding...',
					closing: 'Thank you for your time.',
				},
			};

			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Complex Config Collector',
				systemPrompt: 'You are a sophisticated collector.',
				config: complexConfig,
			};

			const result = await createCollector(collectorParams);
			expect(result.config).toEqual(complexConfig);
		});

		it('should handle very long system prompts', async () => {
			const longPrompt = 'A'.repeat(5000); // Test very long TEXT field
			const collectorParams: CreateCollectorParams = {
				organizationId: testOrganizationId,
				userId: testUserId,
				name: 'Long Prompt Collector',
				systemPrompt: longPrompt,
			};

			const result = await createCollector(collectorParams);
			expect(result.systemPrompt).toBe(longPrompt);
		});
	});
});
