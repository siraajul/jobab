'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Top-level error boundary. Re-renders on `reset()`; the user can also click
 * "Try again" or jump back to the inbox. Real production would also push the
 * error + digest to Sentry here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[jobab] route error', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-lg">
        <div className="font-display text-[26px] font-bold tracking-display">Something broke<span className="text-accent">.</span></div>
        <p className="mt-3 text-[13.5px] text-ink-2">
          {error.message || 'An unexpected error happened on this page.'}
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-ink-3">ref: {error.digest}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Try again
          </button>
          <Link
            href="/inbox"
            className="rounded-xl border border-border-2 bg-surface-2 px-4 py-2.5 font-display text-[14px] font-semibold text-ink transition hover:bg-surface-3"
          >
            Back to inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
