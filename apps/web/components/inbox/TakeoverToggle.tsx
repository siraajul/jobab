'use client';

import { cn } from '@/lib/cn';
import type { ConversationStatus } from '@/lib/types';

export function TakeoverToggle({
  status,
  onTakeOver,
  onHandBack,
}: {
  status: ConversationStatus;
  onTakeOver: () => void;
  onHandBack: () => void;
}) {
  const aiOn = status === 'bot';
  const youOn = status === 'human' || status === 'needs_human';
  return (
    <div className="inline-flex items-center rounded-full border border-border-2 bg-surface-2 p-1">
      <button
        type="button"
        onClick={onHandBack}
        className={cn(
          'min-h-[34px] rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors',
          aiOn ? 'bg-surface text-accent-ink shadow-sm' : 'text-ink-2',
        )}
      >
        AI handles
      </button>
      <button
        type="button"
        onClick={onTakeOver}
        className={cn(
          'min-h-[34px] rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors',
          youOn ? 'bg-surface text-you shadow-sm' : 'text-ink-2',
        )}
      >
        Take over
      </button>
    </div>
  );
}
