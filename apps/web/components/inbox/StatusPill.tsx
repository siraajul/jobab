import { cn } from '@/lib/cn';
import type { ConversationStatus } from '@/lib/types';

// Tones map to spec §4: AI handling · Needs you · You're handling · Paid.
const TONE: Record<ConversationStatus, { label: string; dot: string; chip: string; text: string }> = {
  bot: {
    label: 'AI handling',
    dot: 'bg-accent',
    chip: 'bg-accent-soft',
    text: 'text-accent-ink',
  },
  needs_human: {
    label: 'Needs you',
    dot: 'bg-amber',
    chip: 'bg-amber-bg',
    text: 'text-amber',
  },
  human: {
    label: "You're handling",
    dot: 'bg-you',
    chip: 'bg-you-bg',
    text: 'text-you',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-ink-3',
    chip: 'bg-surface-2',
    text: 'text-ink-2',
  },
};

export function StatusPill({
  status,
  pulse = false,
  className,
}: {
  status: ConversationStatus;
  pulse?: boolean;
  className?: string;
}) {
  const tone = TONE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap',
        tone.chip,
        tone.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot, pulse && 'animate-jb-pulse')} />
      {tone.label}
    </span>
  );
}
