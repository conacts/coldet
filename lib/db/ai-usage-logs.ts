import { eq, and, gte, lte, sum, desc } from 'drizzle-orm';
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
		let query = db
			.select()
			.from(aiUsageLogs)
			.where(eq(aiUsageLogs.organizationId, organizationId))
			.orderBy(desc(aiUsageLogs.createdAt));

		if (limit) {
			query = query.limit(limit);
		}

		return await query;
	} catch (error) {
		throw error;
	}
}

export async function getAiUsageLogsByUserId(
	userId: string,
	limit?: number
): Promise<AiUsageLog[]> {
	try {
		let query = db
			.select()
			.from(aiUsageLogs)
			.where(eq(aiUsageLogs.userId, userId))
			.orderBy(desc(aiUsageLogs.createdAt));

		if (limit) {
			query = query.limit(limit);
		}

		return await query;
	} catch (error) {
		throw error;
	}
}

export async function getAiUsageLogsByCollectorId(
	collectorId: string,
	limit?: number
): Promise<AiUsageLog[]> {
	try {
		let query = db
			.select()
			.from(aiUsageLogs)
			.where(eq(aiUsageLogs.collectorId, collectorId))
			.orderBy(desc(aiUsageLogs.createdAt));

		if (limit) {
			query = query.limit(limit);
		}

		return await query;
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
		let query = db
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
			query = query.limit(limit);
		}

		return await query;
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

export async function getOrganizationUsageSummary(
	organizationId: string,
	startDate?: Date,
	endDate?: Date
): Promise<UsageSummary> {
	try {
		let whereClause = eq(aiUsageLogs.organizationId, organizationId);

		if (startDate && endDate) {
			whereClause = and(
				whereClause,
				gte(aiUsageLogs.createdAt, startDate),
				lte(aiUsageLogs.createdAt, endDate)
			);
		}

		const result = await db
			.select({
				totalTokens: sum(aiUsageLogs.totalTokens),
				totalCostCents: sum(aiUsageLogs.costCents),
				totalRequests: sum(aiUsageLogs.totalTokens), // We'll count rows instead
				promptTokens: sum(aiUsageLogs.promptTokens),
				completionTokens: sum(aiUsageLogs.completionTokens),
			})
			.from(aiUsageLogs)
			.where(whereClause);

		const summary = result[0];
		
		// Get actual count of requests
		const countResult = await db
			.select({ count: aiUsageLogs.id })
			.from(aiUsageLogs)
			.where(whereClause);

		return {
			totalTokens: Number(summary.totalTokens) || 0,
			totalCostCents: Number(summary.totalCostCents) || 0,
			totalRequests: countResult.length || 0,
			promptTokens: Number(summary.promptTokens) || 0,
			completionTokens: Number(summary.completionTokens) || 0,
		};
	} catch (error) {
		throw error;
	}
}

export async function getUserUsageSummary(
	userId: string,
	startDate?: Date,
	endDate?: Date
): Promise<UsageSummary> {
	try {
		let whereClause = eq(aiUsageLogs.userId, userId);

		if (startDate && endDate) {
			whereClause = and(
				whereClause,
				gte(aiUsageLogs.createdAt, startDate),
				lte(aiUsageLogs.createdAt, endDate)
			);
		}

		const result = await db
			.select({
				totalTokens: sum(aiUsageLogs.totalTokens),
				totalCostCents: sum(aiUsageLogs.costCents),
				promptTokens: sum(aiUsageLogs.promptTokens),
				completionTokens: sum(aiUsageLogs.completionTokens),
			})
			.from(aiUsageLogs)
			.where(whereClause);

		const summary = result[0];
		
		// Get actual count of requests
		const countResult = await db
			.select({ count: aiUsageLogs.id })
			.from(aiUsageLogs)
			.where(whereClause);

		return {
			totalTokens: Number(summary.totalTokens) || 0,
			totalCostCents: Number(summary.totalCostCents) || 0,
			totalRequests: countResult.length || 0,
			promptTokens: Number(summary.promptTokens) || 0,
			completionTokens: Number(summary.completionTokens) || 0,
		};
	} catch (error) {
		throw error;
	}
}

export async function getCollectorUsageSummary(
	collectorId: string,
	startDate?: Date,
	endDate?: Date
): Promise<UsageSummary> {
	try {
		let whereClause = eq(aiUsageLogs.collectorId, collectorId);

		if (startDate && endDate) {
			whereClause = and(
				whereClause,
				gte(aiUsageLogs.createdAt, startDate),
				lte(aiUsageLogs.createdAt, endDate)
			);
		}

		const result = await db
			.select({
				totalTokens: sum(aiUsageLogs.totalTokens),
				totalCostCents: sum(aiUsageLogs.costCents),
				promptTokens: sum(aiUsageLogs.promptTokens),
				completionTokens: sum(aiUsageLogs.completionTokens),
			})
			.from(aiUsageLogs)
			.where(whereClause);

		const summary = result[0];
		
		// Get actual count of requests
		const countResult = await db
			.select({ count: aiUsageLogs.id })
			.from(aiUsageLogs)
			.where(whereClause);

		return {
			totalTokens: Number(summary.totalTokens) || 0,
			totalCostCents: Number(summary.totalCostCents) || 0,
			totalRequests: countResult.length || 0,
			promptTokens: Number(summary.promptTokens) || 0,
			completionTokens: Number(summary.completionTokens) || 0,
		};
	} catch (error) {
		throw error;
	}
}

export async function deleteAiUsageLog(id: string): Promise<void> {
	try {
		await db
			.delete(aiUsageLogs)
			.where(eq(aiUsageLogs.id, id));
	} catch (error) {
		throw error;
	}
}

export async function deleteAiUsageLogsByOrganizationId(organizationId: string): Promise<void> {
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