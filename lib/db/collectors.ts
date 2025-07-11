import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { Collector } from '@/lib/db/schema';
import { collectors } from '@/lib/db/schema';

export interface CreateCollectorParams {
	organizationId: string;
	userId: string;
	name: string;
	description?: string | null;
	systemPrompt: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	canEscalate?: boolean;
	canReply?: boolean;
	config?: Record<string, unknown> | null;
	active?: boolean;
}

export async function createCollector({
	organizationId,
	userId,
	name,
	description,
	systemPrompt,
	model = 'gpt-4o-mini',
	temperature = 0.7,
	maxTokens = 1000,
	canEscalate = true,
	canReply = true,
	config = null,
	active = true,
}: CreateCollectorParams): Promise<Collector> {
	try {
		const [collector] = await db
			.insert(collectors)
			.values({
				organizationId,
				userId,
				name,
				description,
				systemPrompt,
				model,
				temperature,
				maxTokens,
				canEscalate,
				canReply,
				config,
				active,
			})
			.returning();
		return collector;
	} catch (error) {
		throw error;
	}
}

export async function getCollectorById(id: string): Promise<Collector | null> {
	try {
		const result = await db
			.select()
			.from(collectors)
			.where(eq(collectors.id, id))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getCollectorsByOrganizationId(organizationId: string): Promise<Collector[]> {
	try {
		return await db
			.select()
			.from(collectors)
			.where(eq(collectors.organizationId, organizationId));
	} catch (error) {
		throw error;
	}
}

export async function getActiveCollectorsByOrganizationId(organizationId: string): Promise<Collector[]> {
	try {
		return await db
			.select()
			.from(collectors)
			.where(
				and(
					eq(collectors.organizationId, organizationId),
					eq(collectors.active, true)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getCollectorsByUserId(
	organizationId: string,
	userId: string
): Promise<Collector[]> {
	try {
		return await db
			.select()
			.from(collectors)
			.where(
				and(
					eq(collectors.organizationId, organizationId),
					eq(collectors.userId, userId)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function getActiveCollectorsByUserId(
	organizationId: string,
	userId: string
): Promise<Collector[]> {
	try {
		return await db
			.select()
			.from(collectors)
			.where(
				and(
					eq(collectors.organizationId, organizationId),
					eq(collectors.userId, userId),
					eq(collectors.active, true)
				)
			);
	} catch (error) {
		throw error;
	}
}

export async function updateCollector(
	id: string,
	updates: Partial<Omit<Collector, 'id' | 'organizationId' | 'userId' | 'createdAt'>>
): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		throw error;
	}
}

export async function updateCollectorPrompt(
	id: string,
	systemPrompt: string
): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({ systemPrompt, updatedAt: new Date() })
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		throw error;
	}
}

export async function updateCollectorConfig(
	id: string,
	config: Record<string, unknown>
): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({ config, updatedAt: new Date() })
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deactivateCollector(id: string): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({ active: false, updatedAt: new Date() })
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		throw error;
	}
}

export async function activateCollector(id: string): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({ active: true, updatedAt: new Date() })
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deleteCollector(id: string): Promise<void> {
	try {
		await db
			.delete(collectors)
			.where(eq(collectors.id, id));
	} catch (error) {
		throw error;
	}
}

export async function getAllActiveCollectors(): Promise<Collector[]> {
	try {
		return await db
			.select()
			.from(collectors)
			.where(eq(collectors.active, true));
	} catch (error) {
		throw error;
	}
}

export async function getCollectorByName(
	organizationId: string,
	name: string
): Promise<Collector | null> {
	try {
		const result = await db
			.select()
			.from(collectors)
			.where(
				and(
					eq(collectors.organizationId, organizationId),
					eq(collectors.name, name)
				)
			)
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getCollectorByNameAndUser(
	organizationId: string,
	userId: string,
	name: string
): Promise<Collector | null> {
	try {
		const result = await db
			.select()
			.from(collectors)
			.where(
				and(
					eq(collectors.organizationId, organizationId),
					eq(collectors.userId, userId),
					eq(collectors.name, name)
				)
			)
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function updateCollectorCapabilities(
	id: string,
	canEscalate: boolean,
	canReply: boolean
): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({
				canEscalate,
				canReply,
				updatedAt: new Date()
			})
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		throw error;
	}
}

export async function canUserAccessCollector(
	collectorId: string,
	userId: string,
	userRole: string
): Promise<boolean> {
	try {
		const collector = await getCollectorById(collectorId);
		if (!collector) {
			return false;
		}

		// Admins can access all collectors in their organization
		if (userRole === 'admin') {
			return true;
		}

		// Users can access their own collectors
		return collector.userId === userId;
	} catch (error) {
		throw error;
	}
}

export async function canUserModifyCollector(
	collectorId: string,
	userId: string,
	userRole: string
): Promise<boolean> {
	try {
		const collector = await getCollectorById(collectorId);
		if (!collector) return false;

		// Admins can modify all collectors in their organization
		if (userRole === 'admin') return true;

		// Users can only modify their own collectors
		return collector.userId === userId;
	} catch (error) {
		throw error;
	}
}

export async function getCollectorCount(organizationId: string): Promise<number> {
	try {
		const result = await db
			.select({ count: collectors.id })
			.from(collectors)
			.where(eq(collectors.organizationId, organizationId));
		return result.length;
	} catch (error) {
		throw error;
	}
}

export async function getCollectorCountByUser(
	organizationId: string,
	userId: string
): Promise<number> {
	try {
		const result = await db
			.select({ count: collectors.id })
			.from(collectors)
			.where(
				and(
					eq(collectors.organizationId, organizationId),
					eq(collectors.userId, userId)
				)
			);
		return result.length;
	} catch (error) {
		throw error;
	}
}