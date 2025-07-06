import { cn } from '@/lib/utils';
import { CircleIcon } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
  return <CircleIcon className={cn('size-4 stroke-4 text-foreground', className)} />;
}
