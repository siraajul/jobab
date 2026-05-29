'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { JamdaniBand, JamdaniMark } from '@/components/shared/Jamdani';
import { api, ApiError } from '@/lib/api';

interface Preview {
  email: string;
  role: 'owner' | 'admin' | 'agent';
  organizationName: string;
  invitedBy: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token.trim()) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await api.inspectInvite(token.trim());
        if (!cancelled) {
          setPreview(p);
          setPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(
            err instanceof ApiError && err.status === 400
              ? 'This invite has expired or already been used.'
              : "Couldn't load this invite.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.acceptInvite(token.trim(), name.trim(), password);
      router.replace('/inbox');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('Invite invalid or expired.');
      } else {
        setError('Sign-up failed. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-[20px] bg-surface shadow-lg">
        <div className="flex flex-col items-center gap-3 px-7 pt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white shadow-md">
            <JamdaniMark size={20} />
          </div>
          <div className="font-display text-[22px] font-bold leading-none tracking-display">Join the team</div>
        </div>
        <div className="px-7">
          <JamdaniBand className="mt-5 h-2 text-accent" />
        </div>

        {preview && (
          <div className="mx-7 mt-5 rounded-xl bg-accent-soft px-3 py-3 text-[13px] text-ink">
            <div className="font-display text-[15px] font-semibold tracking-display">
              {preview.organizationName}
            </div>
            <div className="mt-0.5 text-[12.5px] text-ink-2">
              {preview.invitedBy} invited you as{' '}
              <span className="font-semibold uppercase tracking-wider text-accent-ink">
                {preview.role}
              </span>
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-3">
              For {preview.email} · expires {new Date(preview.expiresAt).toLocaleDateString()}
            </div>
          </div>
        )}
        {previewError && (
          <div className="mx-7 mt-5 rounded-xl bg-red-bg px-3 py-2 text-[13px] text-red">
            {previewError}
          </div>
        )}

        <div className="flex flex-col gap-4 px-7 pb-7 pt-5">
          {!params.get('token') && (
            <Field
              label="Invite token"
              value={token}
              onChange={setToken}
              required
              placeholder="paste the token your owner shared"
            />
          )}
          <Field label="Your name" value={name} onChange={setName} required />
          <Field
            label="Set a password"
            value={password}
            onChange={setPassword}
            type="password"
            required
            minLength={8}
            placeholder="at least 8 characters"
          />
          {error && <div className="text-[13px] text-red">{error}</div>}
          <button
            type="submit"
            disabled={busy || !token || !name || password.length < 8 || !preview}
            className="rounded-xl bg-accent px-4 py-3 font-display text-[15px] font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {busy ? 'Creating account…' : preview ? `Join ${preview.organizationName}` : 'Verify invite first'}
          </button>
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
