import { JamdaniMark } from './Jamdani';
import { cn } from '@/lib/cn';

export function EmptyState({
  title,
  body,
  hint,
  className,
}: {
  title: string;
  body: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-3 px-8 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <JamdaniMark size={26} />
      </div>
      <div className="font-display text-[20px] font-semibold leading-tight tracking-display">{title}</div>
      <div className="max-w-[22rem] text-[13.5px] leading-relaxed text-ink-2">{body}</div>
      {hint && (
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {hint}
        </div>
      )}
    </div>
  );
}
