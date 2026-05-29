'use client';

import { useEffect, useState } from 'react';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { api, type InviteRow, type MemberRow } from '@/lib/api';
import { cn } from '@/lib/cn';

type Role = 'owner' | 'admin' | 'agent';

export function MembersSection({ currentRole }: { currentRole: Role }) {
  const toast = useToast();
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const canManage = currentRole === 'owner' || currentRole === 'admin';

  const refresh = async () => {
    try {
      const m = await api.listMembers();
      setMembers(m);
    } catch {
      /* offline */
    }
    if (canManage) {
      try {
        const i = await api.listInvites();
        setInvites(i);
      } catch {
        /* not allowed */
      }
    }
  };
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <JamdaniMark size={14} className="text-accent" />
        <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
          Team
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
          Members
        </div>
        <ul className="mt-2 divide-y divide-border">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="font-semibold">{m.user.name || m.user.email}</div>
                <div className="text-[12.5px] text-ink-3">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <RoleChip role={m.role} />
                {canManage && m.role !== 'owner' && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove ${m.user.email}?`)) return;
                      try {
                        await api.removeMember(m.id);
                        toast('success', 'Member removed.');
                        refresh();
                      } catch {
                        toast('error', "Couldn't remove member.");
                      }
                    }}
                    className="rounded-md border border-border-2 px-2 py-1 text-[11.5px] text-ink-2 transition hover:bg-surface-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
          {members && members.length === 0 && (
            <li className="py-2 text-[13px] text-ink-3">No members yet.</li>
          )}
        </ul>
      </div>

      {canManage && (
        <>
          <div className="mt-5">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
              Pending invites
            </div>
            <ul className="mt-2 divide-y divide-border">
              {(invites ?? []).length === 0 ? (
                <li className="py-2 text-[13px] text-ink-3">None.</li>
              ) : (
                (invites ?? []).map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold">{inv.email}</div>
                      <div className="text-[12.5px] text-ink-3">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleChip role={inv.role} />
                      <button
                        onClick={async () => {
                          try {
                            await api.revokeInvite(inv.id);
                            toast('info', 'Invite revoked.');
                            refresh();
                          } catch {
                            toast('error', "Couldn't revoke.");
                          }
                        }}
                        className="rounded-md border border-border-2 px-2 py-1 text-[11.5px] text-ink-2 transition hover:bg-surface-2"
                      >
                        Revoke
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <InviteForm
            onCreated={(token) => {
              setIssuedToken(token);
              refresh();
            }}
          />

          {issuedToken && <InviteLinkPreview token={issuedToken} />}
        </>
      )}
    </section>
  );
}

function InviteForm({ onCreated }: { onCreated: (token: string) => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('agent');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const { token } = await api.createInvite(email, role);
      onCreated(token);
      setEmail('');
      toast('success', `Invite created for ${email}.`);
    } catch {
      toast('error', "Couldn't create invite.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="teammate@example.com"
        required
        className="rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[14px] outline-none focus:border-accent"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[14px] outline-none focus:border-accent"
      >
        <option value="agent">Agent</option>
        <option value="admin">Admin</option>
        <option value="owner">Owner</option>
      </select>
      <button
        type="submit"
        disabled={busy || !email}
        className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? 'Inviting…' : 'Invite'}
      </button>
    </form>
  );
}

function InviteLinkPreview({ token }: { token: string }) {
  const toast = useToast();
  const url = typeof window === 'undefined'
    ? `/accept-invite?token=${token}`
    : `${window.location.origin}/accept-invite?token=${token}`;
  return (
    <div className="mt-4 rounded-xl border border-dashed border-accent bg-accent-soft p-3 text-[13px]">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-accent-ink">
        Share this invite link
      </div>
      <div className="break-all font-mono text-[12.5px] text-ink">{url}</div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast('success', 'Invite link copied. Share via WhatsApp or email.');
          }}
          className="rounded-md bg-accent px-2.5 py-1.5 text-[11.5px] font-semibold text-white"
        >
          Copy link
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent('Join my Jobab team: ' + url)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border-2 bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2 transition hover:bg-surface-2"
        >
          Share on WhatsApp
        </a>
      </div>
      <div className="mt-2 text-[11px] text-ink-2">
        Expires in 7 days. We only show it once.
      </div>
    </div>
  );
}

function RoleChip({ role }: { role: Role }) {
  const styles = {
    owner: 'bg-accent-soft text-accent-ink',
    admin: 'bg-you-bg text-you',
    agent: 'bg-surface-2 text-ink-2',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em]', styles[role])}>
      {role}
    </span>
  );
}
