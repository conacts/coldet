'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const settingsRoutes = [
	{
		name: 'Account',
		href: '/settings/account',
	},
];

export function SettingsNav() {
	const pathname = usePathname();

	return (
		<nav className="flex flex-col gap-2">
			{settingsRoutes.map((route) => (
				<Link key={route.href} href={route.href}>
					<Button
						variant={pathname === route.href ? 'secondary' : 'ghost'}
						className="w-full justify-start text-left text-base"
					>
						{route.name}
					</Button>
				</Link>
			))}
		</nav>
	);
}
