'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  tone: Tone;
  message: string;
  sticky: boolean;
  ttl: number;
  action?: { label: string; onClick: () => void | Promise<void> };
}

interface ToastApi {
  push: (tone: Tone, message: string, ttl?: number) => number;
  pushSticky: (tone: Tone, message: string, action: Toast['action']) => number;
  pushUndo: (message: string, onUndo: () => void | Promise<void>) => number;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastApi['push']>(
    (tone, message, ttl = 4200) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, tone, message, ttl, sticky: false }]);
      setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss],
  );

  const pushSticky = useCallback<ToastApi['pushSticky']>((tone, message, action) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, message, ttl: 0, sticky: true, action }]);
    return id;
  }, []);

  const pushUndo = useCallback<ToastApi['pushUndo']>(
    (message, onUndo) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [
        ...prev,
        {
          id,
          tone: 'info',
          message,
          ttl: 5000,
          sticky: false,
          action: {
            label: 'Undo',
            onClick: async () => {
              await onUndo();
            },
          },
        },
      ]);
      setTimeout(() => dismiss(id), 5000);
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastApi>(
    () => ({ push, pushSticky, pushUndo, dismiss }),
    [push, pushSticky, pushUndo, dismiss],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13.5px] shadow-md backdrop-blur-md animate-jb-rise',
              t.tone === 'error' && 'border-red bg-red-bg text-red',
              t.tone === 'success' && 'border-paid bg-paid-bg text-paid',
              t.tone === 'info' && 'border-border-2 bg-surface text-ink',
            )}
          >
            <Glyph tone={t.tone} />
            <div className="flex-1 leading-snug">{t.message}</div>
            {t.action && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await t.action!.onClick();
                  } finally {
                    dismiss(t.id);
                  }
                }}
                className={cn(
                  'shrink-0 rounded-md border px-2 py-1 text-[12px] font-semibold transition',
                  t.tone === 'error' && 'border-red text-red hover:bg-red/10',
                  t.tone === 'success' && 'border-paid text-paid hover:bg-paid/10',
                  t.tone === 'info' && 'border-accent text-accent-ink hover:bg-accent/5',
                )}
              >
                {t.action.label}
              </button>
            )}
            {t.sticky && (
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-ink-3 transition hover:bg-ink/10 hover:text-ink"
                aria-label="Dismiss"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be inside <ToastProvider>');
  // Most callers just want toast(tone, message); attach the rest of the API
  // as properties so call sites can do `toast.pushUndo(...)` ergonomically.
  return Object.assign(v.push, {
    push: v.push,
    pushSticky: v.pushSticky,
    pushUndo: v.pushUndo,
    dismiss: v.dismiss,
  }) as typeof v.push & ToastApi;
}

function Glyph({ tone }: { tone: Tone }) {
  if (tone === 'error') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16v.01" />
      </svg>
    );
  }
  if (tone === 'success') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7v.01" />
    </svg>
  );
}
