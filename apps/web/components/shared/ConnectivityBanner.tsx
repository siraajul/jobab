'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky top banner that appears when the backend health check fails. Polls
 * /api/backend/healthz every 10 seconds; flips green again automatically.
 * Lightweight signal — doesn't try to be a full retry queue.
 */
export function ConnectivityBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/backend/healthz', { cache: 'no-store' });
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    check();
    const t = setInterval(check, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-red px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-md">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      Backend unreachable — your last action may not have saved. We&apos;ll reconnect automatically.
    </div>
  );
}
