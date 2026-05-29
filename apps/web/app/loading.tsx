import { ConversationListSkeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 animate-jb-pulse rounded-full bg-accent" />
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
            Loading
          </div>
        </div>
        <ConversationListSkeleton count={4} />
      </div>
    </div>
  );
}
