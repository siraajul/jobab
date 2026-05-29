'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/cn';

/**
 * Right-side overlay drawer (tablet) and full-screen sheet (mobile). Click
 * outside or press Escape to close.
 */
export function Drawer({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-300 xl:hidden',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-bg shadow-lg transition-transform duration-300 ease-[cubic-bezier(.2,.85,.25,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
            <div className="font-display text-[15px] font-semibold tracking-display">{title}</div>
          </div>
        )}
        <div className="flex-1 overflow-hidden">{children}</div>
      </aside>
    </div>
  );
}
