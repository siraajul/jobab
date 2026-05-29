'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { JamdaniBand, JamdaniMark } from '@/components/shared/Jamdani';
import { api, ApiError } from '@/lib/api';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.signUp({ email, password, name, organizationName });
      router.replace('/onboarding');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('That email is already registered. Try signing in.');
      } else {
        setError('Sign-up failed. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 py-8 sm:px-6">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-[20px] bg-surface shadow-lg">
        <div className="flex flex-col items-center gap-3 px-7 pt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white shadow-md">
            <JamdaniMark size={20} />
          </div>
          <div className="font-display text-[26px] font-bold leading-none tracking-display">Welcome to Jobab</div>
          <div className="text-center text-[13px] text-ink-2">
            Set up your shop in 30 seconds. The AI takes it from there.
          </div>
        </div>
        <div className="px-7">
          <JamdaniBand className="mt-6 h-2 text-accent" />
        </div>
        <div className="flex flex-col gap-4 px-7 pb-7 pt-5">
          <Field label="Shop name" value={organizationName} onChange={setOrganizationName} required placeholder="Rongdhonu Boutique" />
          <Field label="Your name" value={name} onChange={setName} required placeholder="Aminul Islam" />
          <Field label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@shop.com" />
          <Field
            label="Set a password"
            type="password"
            value={password}
            onChange={setPassword}
            required
            minLength={8}
            placeholder="at least 8 characters"
          />
          {error && <div className="text-[13px] text-red">{error}</div>}
          <button
            type="submit"
            disabled={busy || !email || !name || !organizationName || password.length < 8}
            className="rounded-xl bg-accent px-4 py-3 font-display text-[15px] font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {busy ? 'Creating your shop…' : 'Create my Jobab'}
          </button>
          <div className="text-center text-[12px] text-ink-3">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-accent-ink hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  minLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">{label}</span>
      <input
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[12px] border border-border-2 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
      />
    </label>
  );
}
