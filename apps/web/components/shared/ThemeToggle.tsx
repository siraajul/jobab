'use client';

import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { getServerThemeSnapshot, getThemeSnapshot, setTheme, subscribeToTheme } from '@/lib/theme';

/**
 * Toggles between theme-light / theme-dark on <html>. Persists to localStorage
 * so the choice survives reloads.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const swap = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={swap}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border border-border-2 bg-surface text-ink-2 transition hover:bg-surface-2 hover:text-ink',
        className,
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  );
}

function Sun() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function Moon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 13.2A9 9 0 1110.8 3a7 7 0 0010.2 10.2z" />
    </svg>
  );
}
