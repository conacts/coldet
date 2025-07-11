import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { Organization } from '@/lib/db/schema';
import { organizations } from '@/lib/db/schema';

export interface CreateOrganizationParams {
	name: string;
	description?: string | null;
	settings?: Record<string, unknown> | null;
	active?: boolean;
}

export async function createOrganization({
	name,
	description,
	settings = null,
	active = true,
}: CreateOrganizationParams): Promise<Organization> {
	try {
		const [organization] = await db
			.insert(organizations)
			.values({
				name,
				description,
				settings,
				active,
			})
			.returning();
		return organization;
	} catch (error) {
		throw error;
	}
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
	try {
		const result = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, id))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function updateOrganization(
	id: string,
	updates: Partial<Omit<Organization, 'id' | 'createdAt'>>
): Promise<Organization | null> {
	try {
		const [organization] = await db
			.update(organizations)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(organizations.id, id))
			.returning();
		return organization ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deactivateOrganization(id: string): Promise<Organization | null> {
	try {
		const [organization] = await db
			.update(organizations)
			.set({ active: false, updatedAt: new Date() })
			.where(eq(organizations.id, id))
			.returning();
		return organization ?? null;
	} catch (error) {
		throw error;
	}
}

export async function activateOrganization(id: string): Promise<Organization | null> {
	try {
		const [organization] = await db
			.update(organizations)
			.set({ active: true, updatedAt: new Date() })
			.where(eq(organizations.id, id))
			.returning();
		return organization ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deleteOrganization(id: string): Promise<void> {
	try {
		await db
			.delete(organizations)
			.where(eq(organizations.id, id));
	} catch (error) {
		throw error;
	}
}

export async function getActiveOrganizations(): Promise<Organization[]> {
	try {
		return await db
			.select()
			.from(organizations)
			.where(eq(organizations.active, true));
	} catch (error) {
		throw error;
	}
}

export async function getAllOrganizations(): Promise<Organization[]> {
	try {
		return await db
			.select()
			.from(organizations);
	} catch (error) {
		throw error;
	}
}

export async function updateOrganizationSettings(
	id: string,
	settings: Record<string, unknown>
): Promise<Organization | null> {
	try {
		const [organization] = await db
			.update(organizations)
			.set({ settings, updatedAt: new Date() })
			.where(eq(organizations.id, id))
			.returning();
		return organization ?? null;
	} catch (error) {
		throw error;
	}
}