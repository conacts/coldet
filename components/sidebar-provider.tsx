import { cookies } from 'next/headers';
import { SidebarProvider } from '@/components/ui/sidebar';

export async function ResizableSidebarProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const cookieStore = await cookies();
	const sidebarState = cookieStore.get('sidebar:state')?.value;
	// const sidebarWidth = cookieStore.get('sidebar:width')?.value || '24rem';
	let defaultOpen = true;
	if (sidebarState) {
		defaultOpen = sidebarState === 'true';
	}

	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			{children}
		</SidebarProvider>
	);
}
