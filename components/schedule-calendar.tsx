'use client';

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { NotificationsCalendar } from '@/components/notifications-calendar';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleCalendarProps
	extends Omit<
		React.ComponentProps<typeof NotificationsCalendar>,
		'notifications' | 'onSelect'
	> {
	onSelectDate?: (date: Date) => void;
	redirectOnSelect?: boolean;
}

export function ScheduleCalendar({
	onSelectDate,
	redirectOnSelect = false,
	...props
}: ScheduleCalendarProps) {
	const router = useRouter();
	const [notifications, setNotifications] = useState<Record<string, number>>(
		{}
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchDates = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(
					'/api/wp/posts?fields=dates&status=future,publish'
				);
				if (!response.ok) {
					throw new Error('Failed to fetch post dates');
				}
				const data = await response.json();

				// Convert dates to ISO format (YYYY-MM-DD) using UTC
				const formattedDates = Object.entries(data).reduce(
					(acc, [date, count]) => {
						// Create date in UTC
						const utcDate = new Date(date);
						// Get UTC components and create YYYY-MM-DD
						const year = utcDate.getUTCFullYear();
						const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
						const day = String(utcDate.getUTCDate()).padStart(2, '0');
						const isoDate = `${year}-${month}-${day}`;

						acc[isoDate] = count as number;
						return acc;
					},
					{} as Record<string, number>
				);

				setNotifications(formattedDates);
			} catch (err: unknown) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError('Unknown error');
				}
			} finally {
				setLoading(false);
			}
		};
		fetchDates();
	}, []);

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) {
			return;
		}
		// Format date as YYYY-MM-DD
		const formattedDate = date
			.toLocaleDateString('en-US', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
			})
			.replace(/\//g, '-');

		// If redirectOnSelect is true, navigate to the schedule page
		if (redirectOnSelect) {
			router.push(`/schedule/${formattedDate}`);
		}

		// Call the onSelectDate prop if provided
		onSelectDate?.(date);
	};

	if (loading) {
		return <Skeleton className="aspect-square w-full" />;
	}
	if (error) {
		return <div className='p-2 text-destructive text-sm'>Error: {error}</div>;
	}

	return (
		<NotificationsCalendar
			notifications={notifications}
			onSelect={handleDateSelect}
			{...props}
		/>
	);
}
