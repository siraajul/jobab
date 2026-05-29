'use client';

import { cn } from '@/lib/cn';
import { JamdaniMark } from '@/components/shared/Jamdani';

export type MobileView = 'list' | 'thread' | 'order';

const TABS: Array<{ key: MobileView; label: string; icon: () => React.ReactElement }> = [
  { key: 'list', label: 'Inbox', icon: InboxIcon },
  { key: 'thread', label: 'Thread', icon: ThreadIcon },
  { key: 'order', label: 'Order', icon: OrderIcon },
];

export function MobileNav({
  view,
  onChange,
  needs,
  threadEnabled,
  orderEnabled,
  threadUnread = false,
}: {
  view: MobileView;
  onChange: (v: MobileView) => void;
  needs: number;
  threadEnabled: boolean;
  orderEnabled: boolean;
  threadUnread?: boolean;
}) {
  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur-md xl:hidden">
      {TABS.map((t) => {
        const disabled =
          (t.key === 'thread' && !threadEnabled) || (t.key === 'order' && !orderEnabled);
        const active = view === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => !disabled && onChange(t.key)}
            disabled={disabled}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] transition',
              active && 'text-accent-ink',
              !active && !disabled && 'text-ink-2',
              disabled && 'text-ink-3 opacity-40',
            )}
          >
            <div className="relative flex h-7 items-center">
              {active && <JamdaniMark size={11} className="absolute -top-1 left-1/2 -translate-x-1/2 text-accent" />}
              <t.icon />
              {t.key === 'list' && needs > 0 && (
                <span className="absolute -right-3 -top-1 min-w-[18px] rounded-full bg-amber px-1 text-[10px] font-bold text-white">
                  {needs}
                </span>
              )}
              {t.key === 'thread' && threadUnread && (
                <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-accent" />
              )}
            </div>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 13l3-8h12l3 8M3 13v6a1 1 0 001 1h16a1 1 0 001-1v-6M3 13h5l1.5 2h5L16 13h5" />
    </svg>
  );
}
function ThreadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.5 8.5 0 11-3.4-6.8L21 4l-1.2 3.4A8.5 8.5 0 0121 11.5z" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  );
}
function OrderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4l2 4h8l2-4M5 8h14l-1 12H6L5 8z" />
      <path d="M9 12v4M15 12v4" />
    </svg>
  );
}
