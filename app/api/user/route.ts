// an api route to get and update user details

import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { User } from '@/lib/db/schema';
import { updateUser } from '@/lib/db/users';

export async function GET() {
	const session = await auth();

	return NextResponse.json({ session });
}

export async function PATCH(request: Request) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// TODO: we need to prevent this function from being used to update the password
		const updateData: Partial<User> = await request.json();

		const updatedUser = await updateUser(session.user.id, updateData);

		if (!updatedUser) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			user: updatedUser,
		});
	} catch (error) {
		console.error('Error updating user:', error);
		return NextResponse.json(
			{ error: 'Failed to update user' },
			{ status: 500 }
		);
	}
}
