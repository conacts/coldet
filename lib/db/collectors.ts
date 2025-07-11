import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { Collector } from '@/lib/db/schema';
import { collectors } from '@/lib/db/schema';

export interface CreateCollectorParams {
	userId: string;
	name: string;
	description?: string | null;
	systemPrompt: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	canEscalate?: boolean;
	canReply?: boolean;
	config?: Record<string, any> | null;
	active?: boolean;
}

export async function createCollector({
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
		console.error('Error creating collector', error);
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
		console.error('Error getting collector by id', error);
		throw error;
	}
}

export async function getCollectorsByUserId(userId: string): Promise<Collector[]> {
	try {
		return await db
			.select()
			.from(collectors)
			.where(eq(collectors.userId, userId));
	} catch (error) {
		console.error('Error getting collectors by user id', error);
		throw error;
	}
}

export async function getActiveCollectorsByUserId(userId: string): Promise<Collector[]> {
	try {
		return await db
			.select()
			.from(collectors)
			.where(
				and(
					eq(collectors.userId, userId),
					eq(collectors.active, true)
				)
			);
	} catch (error) {
		console.error('Error getting active collectors by user id', error);
		throw error;
	}
}

export async function updateCollector(
	id: string,
	updates: Partial<Omit<Collector, 'id' | 'userId' | 'createdAt'>>
): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		console.error('Error updating collector', error);
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
		console.error('Error updating collector prompt', error);
		throw error;
	}
}

export async function updateCollectorConfig(
	id: string,
	config: Record<string, any>
): Promise<Collector | null> {
	try {
		const [collector] = await db
			.update(collectors)
			.set({ config, updatedAt: new Date() })
			.where(eq(collectors.id, id))
			.returning();
		return collector ?? null;
	} catch (error) {
		console.error('Error updating collector config', error);
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
		console.error('Error deactivating collector', error);
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
		console.error('Error activating collector', error);
		throw error;
	}
}

export async function deleteCollector(id: string): Promise<void> {
	try {
		await db
			.delete(collectors)
			.where(eq(collectors.id, id));
	} catch (error) {
		console.error('Error deleting collector', error);
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
		console.error('Error getting all active collectors', error);
		throw error;
	}
}

export async function getCollectorByName(
	userId: string,
	name: string
): Promise<Collector | null> {
	try {
		const result = await db
			.select()
			.from(collectors)
			.where(
				and(
					eq(collectors.userId, userId),
					eq(collectors.name, name)
				)
			)
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		console.error('Error getting collector by name', error);
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
		console.error('Error updating collector capabilities', error);
		throw error;
	}
}