'use client';

import Link from 'next/link';
import type { User } from 'next-auth';
import { Logo } from '@/components/logo';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarRail,
	useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar({ user }: { user: User | undefined }) {
	const { setOpenMobile } = useSidebar();

	return (
		<Sidebar className="group-data-[side=left]:border-r-2">
			<SidebarHeader>
				<SidebarMenu>
					<div className="flex flex-row items-center justify-between">
						<Link
							className="flex flex-row items-center gap-3"
							href="/"
							onClick={() => {
								setOpenMobile(false);
							}}
						>
							<span className="flex cursor-pointer flex-row items-center gap-2 rounded-md px-2 font-semibold text-lg">
								<Logo className="size-6" />
								Coldets
							</span>
						</Link>
					</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{/* <ScheduleCalendar redirectOnSelect={true} /> */}
				{/* <SidebarHistory user={user} /> */}
			</SidebarContent>
			<SidebarRail />
			<SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
		</Sidebar>
	);
}
