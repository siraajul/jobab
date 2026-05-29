'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { JamdaniBand, JamdaniMark } from '@/components/shared/Jamdani';
import { api, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/inbox';
  const reason = params.get('reason');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(reason === 'expired' ? 'Session expired — please sign in again.' : null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      router.replace(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Wrong email or password.');
      } else if (err instanceof ApiError) {
        setError(`Login failed (${err.status}).`);
      } else {
        setError('Login failed. Is the backend running?');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 py-8 sm:px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm overflow-hidden rounded-[20px] bg-surface shadow-lg"
      >
        <div className="flex flex-col items-center gap-3 px-7 pt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white shadow-md">
            <JamdaniMark size={20} />
          </div>
          <div className="font-display text-[26px] font-bold leading-none tracking-display">
            Jobab
          </div>
          <div className="text-center text-[13px] text-ink-2">
            Merchant dashboard for your AI sales agent.
          </div>
        </div>
        <div className="px-7">
          <JamdaniBand className="mt-6 h-2 text-accent" />
        </div>
        <div className="flex flex-col gap-4 px-7 pb-7 pt-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
              Email
            </span>
            <input
              type="email"
              autoFocus
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[12px] border border-border-2 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[12px] border border-border-2 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
            />
          </label>
          {error && <div className="text-[13px] text-red">{error}</div>}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="rounded-xl bg-accent px-4 py-3 font-display text-[15px] font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="space-y-1 text-center text-[12px] text-ink-3">
            <div>
              New here?{' '}
              <Link href="/sign-up" className="font-semibold text-accent-ink hover:underline">
                Create your shop
              </Link>
            </div>
            <div>
              Joining a team?{' '}
              <Link href="/accept-invite" className="font-semibold text-accent-ink hover:underline">
                Use the invite link
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
