'use client';

// replace with lucide
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { Logo } from '@/components/logo';
import { ScheduleCalendar } from '@/components/schedule-calendar';
// import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarRail,
	useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: User | undefined }) {
	const router = useRouter();
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
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="h-fit p-2"
									onClick={() => {
										setOpenMobile(false);
										router.push('/chat');
										router.refresh();
									}}
									type="button"
									variant="outline"
								>
									<PlusIcon />
								</Button>
							</TooltipTrigger>
							<TooltipContent align="end">New Chat</TooltipContent>
						</Tooltip>
					</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<ScheduleCalendar redirectOnSelect={true} />
				{/* <SidebarHistory user={user} /> */}
			</SidebarContent>
			<SidebarRail />
			<SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
		</Sidebar>
	);
}
