'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

/** Collapsible right-rail section with an uppercase header, optional count, and
 *  a chevron. Children mount only while open, so heavy sections (Activity) defer
 *  their data fetch until expanded. */
export function Section({
  title,
  count,
  defaultOpen = true,
  padded = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  /** Add the standard horizontal padding to the body. Off for children that
   *  bring their own (OrderPanel, SharedFiles, ActivityList). */
  padded?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left transition hover:bg-surface-2"
      >
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">
          {title}
          {count != null && count > 0 && (
            <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-surface-3 px-1 text-[10px] tabular-nums text-ink-2">
              {count}
            </span>
          )}
        </span>
        <svg
          className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className={padded ? 'px-5 pb-4' : 'pb-2'}>{children}</div>}
    </section>
  );
}
