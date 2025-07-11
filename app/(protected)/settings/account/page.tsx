import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { UserSettingsForm } from '@/components/user-settings';
import { getUserByEmail } from '@/lib/db/users';

export default async function UserSettingsPage() {
	const session = await auth();
	if (!session?.user.email) redirect('/login');
	const user = await getUserByEmail(session?.user.email);
	if (!user) redirect('/login');

	return (
		<div className="space-y-6">
			<div>
				<h2 className='font-bold text-2xl'>Account</h2>
				<p className='mt-1 text-muted-foreground'>
					Manage your account details
				</p>
			</div>
			<UserSettingsForm
				firstName={user.firstName ?? ''}
				lastName={user.lastName ?? ''}
			/>
		</div>
	);
}
