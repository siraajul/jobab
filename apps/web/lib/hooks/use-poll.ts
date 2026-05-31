'use client';

import { useEffect, useRef } from 'react';

/**
 * Run an async function on an interval. When the tab is hidden we back off
 * to 8× the interval (mobile-battery-friendly) instead of stopping entirely
 * — so a phone in pocket still picks up urgent updates without draining
 * the battery polling every 3 seconds.
 */
export function usePoll(fn: () => void | Promise<void>, intervalMs: number, deps: unknown[] = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      try {
        await fnRef.current();
      } catch {
        /* swallow — caller surfaces */
      }
      if (cancelled) return;
      const delay = document.visibilityState === 'visible' ? intervalMs : intervalMs * 8;
      timer = setTimeout(tick, delay);
    };

    tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        if (timer) clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}

/**
 * Returns the previous value of any prop. Handy for detecting "new messages
 * arrived" so we can auto-scroll.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
