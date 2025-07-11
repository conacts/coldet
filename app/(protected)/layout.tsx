import { auth } from '@/app/(auth)/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { ResizableSidebarProvider } from '@/components/sidebar-provider';
import { SidebarInset } from '@/components/ui/sidebar';

// export const experimental_ppr = true;

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [session] = await Promise.all([auth()]);
	return (
		<>
			<ResizableSidebarProvider>
				<AppSidebar user={session?.user} />
				<SidebarInset>{children}</SidebarInset>
			</ResizableSidebarProvider>
		</>
	);
}
