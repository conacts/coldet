import { CircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
	return <CircleIcon className={cn('size-4 stroke-4 text-foreground', className)} />;
}
