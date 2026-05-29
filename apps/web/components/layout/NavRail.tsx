'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { JamdaniStrip } from '@/components/shared/Jamdani';

const ITEMS = [
  { key: 'inbox', label: 'Inbox', href: '/inbox', icon: InboxIcon, badge: true },
  { key: 'orders', label: 'Orders', href: '/orders', icon: OrdersIcon },
  { key: 'comments', label: 'Comments', href: '/comments', icon: CommentsIcon },
  { key: 'catalog', label: 'Catalog', href: '/catalog', icon: CatalogIcon },
  { key: 'analytics', label: 'Analytics', href: '/analytics', icon: AnalyticsIcon },
  { key: 'settings', label: 'Settings', href: '/settings', icon: SettingsIcon },
] as const;

export function NavRail() {
  const pathname = usePathname();
  return (
    <nav className="relative flex h-full w-[84px] shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-5">
      <div className="pointer-events-none absolute inset-y-6 left-1/2 w-[18px] -translate-x-1/2 text-accent">
        <JamdaniStrip className="h-full w-full" />
      </div>

      <Link href="/inbox" className="relative z-10 mb-3 flex flex-col items-center gap-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white shadow-md">
          <Spark />
        </div>
        <div className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-ink-2">
          Jobab
        </div>
      </Link>

      <div className="relative z-10 flex flex-col gap-1.5">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'group relative flex h-[48px] w-[48px] items-center justify-center rounded-[14px] transition',
                active
                  ? 'bg-accent-soft text-accent-ink shadow-sm'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )}
              title={item.label}
            >
              <item.icon />
              {item.key === 'inbox' && 'badge' in item && item.badge && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-amber" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Spark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.39 6.61L21 11l-6.61 2.39L12 20l-2.39-6.61L3 11l6.61-2.39L12 2z" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 13l3-8h12l3 8M3 13v6a1 1 0 001 1h16a1 1 0 001-1v-6M3 13h5l1.5 2h5L16 13h5" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4h12l1 6H5l1-6zM5 10h14v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9z" />
    </svg>
  );
}
function CatalogIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 4v16" />
    </svg>
  );
}
function AnalyticsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5M10 19v-7M16 19v-4M22 19H2" />
    </svg>
  );
}
function CommentsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 114.4 16.96l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
