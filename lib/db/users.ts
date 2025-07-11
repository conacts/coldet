import { hash } from 'bcrypt-ts';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { User } from '@/lib/db/schema';
import { users } from '@/lib/db/schema';

export interface CreateUserParams {
	firstName?: string;
	lastName?: string;
	email: string;
	phone?: string | null;
	password: string;
	emailVerified?: boolean;
	active?: boolean;
}

export async function createUser({
	firstName,
	lastName,
	email,
	phone,
	password,
	emailVerified = false,
	active = true,
}: CreateUserParams): Promise<User> {
	try {
		// Hash the password before storing
		const hashedPassword = await hash(password, 10);

		const [user] = await db
			.insert(users)
			.values({
				firstName,
				lastName,
				email,
				phone,
				hashedPassword,
				emailVerified,
				active,
			})
			.returning();
		return user;
	} catch (error) {
		throw error;
	}
}

export async function getUserById(id: string): Promise<User | null> {
	try {
		const result = await db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getUserByEmail(email: string): Promise<User | null> {
	try {
		const result = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		return result[0] ?? null;
	} catch (error) {
		throw error;
	}
}

export async function updateUser(
	id: string,
	updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | null> {
	try {
		const [user] = await db
			.update(users)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	} catch (error) {
		throw error;
	}
}


export async function updateUserLastLogin(id: string): Promise<User | null> {
	try {
		const [user] = await db
			.update(users)
			.set({ lastLoginAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deactivateUser(id: string): Promise<User | null> {
	try {
		const [user] = await db
			.update(users)
			.set({ active: false, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	} catch (error) {
		throw error;
	}
}

export async function activateUser(id: string): Promise<User | null> {
	try {
		const [user] = await db
			.update(users)
			.set({ active: true, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	} catch (error) {
		throw error;
	}
}

export async function getActiveUsers(): Promise<User[]> {
	try {
		return await db.select().from(users).where(eq(users.active, true));
	} catch (error) {
		throw error;
	}
}

export async function verifyUserEmail(id: string): Promise<User | null> {
	try {
		const [user] = await db
			.update(users)
			.set({ emailVerified: true, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	} catch (error) {
		throw error;
	}
}

export async function updateUserPassword(
	id: string,
	hashedPassword: string
): Promise<User | null> {
	try {
		const [user] = await db
			.update(users)
			.set({ hashedPassword, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return user ?? null;
	} catch (error) {
		throw error;
	}
}

export async function deleteUser(id: string): Promise<void> {
	try {
		await db.delete(users).where(eq(users.id, id));
	} catch (error) {
		throw error;
	}
}
