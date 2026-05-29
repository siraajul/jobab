'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type CurrentUser } from '@/lib/api';
import { cn } from '@/lib/cn';

const PALETTE = ['#C8794F', '#5E8A6B', '#9B6A8C', '#4E7A93', '#B0743C', '#7B6FA8', '#A85C5C'];

function initials(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}
function colorFor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}

/**
 * Top-right avatar dropdown. Shows the current user, their role, and a
 * sign-out action. Lives in `AppShell` so every page surfaces it.
 */
export function AvatarMenu() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-avatar-menu]')) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (!user) {
    return <div className="h-9 w-9 rounded-full bg-surface-2" />;
  }

  const name = user.name ?? user.email;
  const role = user.memberships[0]?.role ?? 'agent';

  return (
    <div className="relative" data-avatar-menu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold text-white shadow-sm transition hover:brightness-110"
        style={{ backgroundColor: colorFor(name) }}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
      >
        {initials(name)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[55] mt-2 w-64 overflow-hidden rounded-xl border border-border-2 bg-surface shadow-md"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="truncate font-display text-[15px] font-semibold tracking-display">{name}</div>
            <div className="truncate text-[12px] text-ink-2">{user.email}</div>
            <div className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-ink">
              {role}
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-[13px] text-ink transition hover:bg-surface-2"
          >
            Settings
          </Link>
          <Link
            href="/onboarding"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-[13px] text-ink transition hover:bg-surface-2"
          >
            Onboarding
          </Link>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/backend/auth/logout', { method: 'POST' });
              router.replace('/login');
            }}
            className={cn(
              'block w-full border-t border-border px-4 py-2.5 text-left text-[13px] font-semibold text-red transition hover:bg-red-bg',
            )}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
