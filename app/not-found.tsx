import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
	return (
		<div className='flex min-h-[80vh] flex-col items-center justify-center text-center'>
			<div className='relative mb-8 h-32 w-32'>
				<Logo className="size-32" />
			</div>
			<h1 className='mb-4 font-bold text-4xl'>404 Page Not Found</h1>
			<p className='mb-8 max-w-md text-lg text-muted-foreground'>
				Sorry, the page you are looking for does not exist or has been moved.
			</p>
			<div className="flex gap-4">
				<Button asChild variant="default">
					<Link href="/">Return Home</Link>
				</Button>
				<Button asChild variant="outline">
					<Link href="/dashboard">Dashboard</Link>
				</Button>
			</div>
		</div>
	);
}
