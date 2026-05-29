import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-2', className)} />;
}

export function ConversationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-3.5 py-3">
      <Skeleton className="h-11 w-11 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-7" />
        </div>
        <Skeleton className="h-2.5 w-3/4" />
      </div>
    </div>
  );
}

export function ConversationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </div>
  );
}
