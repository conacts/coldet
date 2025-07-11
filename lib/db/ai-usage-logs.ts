import { and, desc, eq, gte, lte, sum } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { AiUsageLog } from '@/lib/db/schema';
import { aiUsageLogs } from '@/lib/db/schema';

export interface CreateAiUsageLogParams {
	organizationId: string;
	userId: string;
	collectorId?: string | null;
	usageType: string;
	model: string;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	costCents: number;
	metadata?: Record<string, unknown> | null;
}

export async function createAiUsageLog({
	organizationId,
	userId,
	collectorId,
	usageType,
	model,
	promptTokens,
	completionTokens,
	totalTokens,
	costCents,
	metadata = null,
}: CreateAiUsageLogParams): Promise<AiUsageLog> {
	try {
		const [log] = await db
			.insert(aiUsageLogs)
			.values({
				organizationId,
				userId,
				collectorId,
				usageType,
				model,
				promptTokens,
				completionTokens,
				totalTokens,
				costCents,
				metadata,
			})
			.returning();
		return log;
	} catch (error) {
		throw error;
	}
}

export async function getAiUsageLogsByOrganizationId(
	organizationId: string,
	limit?: number
): Promise<AiUsageLog[]> {
	try {
		const baseQuery = db
			.select()
			.from(aiUsageLogs)
			.where(eq(aiUsageLogs.organizationId, organizationId))
			.orderBy(desc(aiUsageLogs.createdAt));

		if (limit) {
			return await baseQuery.limit(limit);
		}

		return await baseQuery;
	} catch (error) {
		throw error;
	}
}

export async function getAiUsageLogsByUserId(
	userId: string,
	limit?: number
): Promise<AiUsageLog[]> {
	try {
		const baseQuery = db
			.select()
			.from(aiUsageLogs)
			.where(eq(aiUsageLogs.userId, userId))
			.orderBy(desc(aiUsageLogs.createdAt));

		if (limit) {
			return await baseQuery.limit(limit);
		}

		return await baseQuery;
	} catch (error) {
		throw error;
	}
}

export async function getAiUsageLogsByCollectorId(
	collectorId: string,
	limit?: number
): Promise<AiUsageLog[]> {
	try {
		const baseQuery = db
			.select()
			.from(aiUsageLogs)
			.where(eq(aiUsageLogs.collectorId, collectorId))
			.orderBy(desc(aiUsageLogs.createdAt));

		if (limit) {
			return await baseQuery.limit(limit);
		}

		return await baseQuery;
	} catch (error) {
		throw error;
	}
}

export async function getAiUsageLogsByDateRange(
	organizationId: string,
	startDate: Date,
	endDate: Date
): Promise<AiUsageLog[]> {
	try {
		return await db
			.select()
			.from(aiUsageLogs)
			.where(
				and(
					eq(aiUsageLogs.organizationId, organizationId),
					gte(aiUsageLogs.createdAt, startDate),
					lte(aiUsageLogs.createdAt, endDate)
				)
			)
			.orderBy(desc(aiUsageLogs.createdAt));
	} catch (error) {
		throw error;
	}
}

export async function getAiUsageLogsByUsageType(
	organizationId: string,
	usageType: string,
	limit?: number
): Promise<AiUsageLog[]> {
	try {
		const baseQuery = db
			.select()
			.from(aiUsageLogs)
			.where(
				and(
					eq(aiUsageLogs.organizationId, organizationId),
					eq(aiUsageLogs.usageType, usageType)
				)
			)
			.orderBy(desc(aiUsageLogs.createdAt));

		if (limit) {
			return await baseQuery.limit(limit);
		}

		return await baseQuery;
	} catch (error) {
		throw error;
	}
}

export interface UsageSummary {
	totalTokens: number;
	totalCostCents: number;
	totalRequests: number;
	promptTokens: number;
	completionTokens: number;
}

export async function deleteAiUsageLog(id: string): Promise<void> {
	try {
		await db.delete(aiUsageLogs).where(eq(aiUsageLogs.id, id));
	} catch (error) {
		throw error;
	}
}

export async function deleteAiUsageLogsByOrganizationId(
	organizationId: string
): Promise<void> {
	try {
		await db
			.delete(aiUsageLogs)
			.where(eq(aiUsageLogs.organizationId, organizationId));
	} catch (error) {
		throw error;
	}
}

export async function deleteAiUsageLogsByDateRange(
	organizationId: string,
	startDate: Date,
	endDate: Date
): Promise<void> {
	try {
		await db
			.delete(aiUsageLogs)
			.where(
				and(
					eq(aiUsageLogs.organizationId, organizationId),
					gte(aiUsageLogs.createdAt, startDate),
					lte(aiUsageLogs.createdAt, endDate)
				)
			);
	} catch (error) {
		throw error;
	}
}
