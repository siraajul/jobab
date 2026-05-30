'use client';

import { handoffLabel, isProblemCategory } from '@/lib/handoff';
import type { ConversationDetail } from '@/lib/types';

/**
 * Banner flagging why the AI handed this conversation off, so the merchant
 * can follow up without scrolling the thread. Red for customer problems
 * (complaint / refund / payment), amber for the softer reasons.
 */
export function HandoffBanner({ active }: { active: ConversationDetail }) {
  const problem = isProblemCategory(active.handoffCategory);
  return (
    <div
      className={
        'flex items-start gap-2 border-b px-3 py-2 text-[12.5px] sm:px-6 ' +
        (problem ? 'border-red/30 bg-red-bg text-red' : 'border-amber/30 bg-amber-bg text-amber')
      }
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className="mt-0.5 shrink-0"
        aria-hidden
      >
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      <div className="min-w-0">
        <span className="font-bold uppercase tracking-wider">
          {handoffLabel(active.handoffCategory)}
        </span>
        {active.handoffReason && <span className="text-ink-2"> — {active.handoffReason}</span>}
      </div>
    </div>
  );
}
