'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/lib/db/schema';

export function UserSettingsForm({
	firstName,
	lastName,
}: {
	firstName: string;
	lastName: string;
}) {
	const [fname, setFname] = useState(firstName);
	const [lname, setLname] = useState(lastName);
	const [isLoading, setIsLoading] = useState(false);

	const handleSave = async () => {
		try {
			setIsLoading(true);

			const updateData: Partial<User> = {
				firstName: fname,
				lastName: lname,
			};

			const response = await fetch('/api/user', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
			});

			if (!response.ok) {
				throw new Error('Failed to update user details');
			}

			const data = await response.json();
			if (data.success) {
				toast.success('User details updated successfully!');
			} else {
				throw new Error(data.error || 'Unknown error occurred');
			}
		} catch (error) {
			console.error('Error updating user details:', error);
			toast.error('Failed to update user details. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>User Details</CardTitle>
				<CardDescription>Edit your user details</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid w-full items-center gap-4">
					<div className="flex flex-col space-y-1.5">
						<Label htmlFor="name">Name</Label>
						<div className="flex flex-row gap-2">
							<Input
								id="fname"
								onChange={(e) => setFname(e.target.value)}
								placeholder="First Name"
								value={fname}
							/>
							<Input
								id="lname"
								onChange={(e) => setLname(e.target.value)}
								placeholder="Last Name"
								value={lname}
							/>
						</div>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button disabled={isLoading} onClick={handleSave}>
					{isLoading ? 'Saving...' : 'Save'}
				</Button>
			</CardFooter>
		</Card>
	);
}
