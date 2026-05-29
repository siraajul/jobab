'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { api, type CurrentUser } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { SettingsPayload } from '@/lib/types';
import { MembersSection } from './MembersSection';

type Role = 'owner' | 'admin' | 'agent';

export function SettingsClient() {
  const toast = useToast();
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getSettings(), api.me()])
      .then(([s, u]) => {
        setData(s);
        setMe(u);
        setName(s.name);
        setInstructions(s.aiInstructions);
      })
      .catch((err) => {
        // 401s already triggered an auto-redirect to /login in the API
        // client. Anything else is a genuine "is the backend up?" case.
        const status = (err as { status?: number } | null)?.status;
        if (status !== 401) {
          toast('error', "Couldn't reach the backend. Trying again will retry.");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data || !me) {
    return <AppShell title="Settings">Loading…</AppShell>;
  }

  const myRole: Role =
    me.memberships.find((m) => m.organizationId === data.id)?.role ?? 'agent';
  const canEdit = myRole === 'owner' || myRole === 'admin';
  const dirty = name !== data.name || instructions !== data.aiInstructions;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({ name, aiInstructions: instructions });
      setData({ ...data, name: updated.name, aiInstructions: updated.aiInstructions });
      toast('success', 'Settings saved. The next AI reply will use the new instructions.');
    } catch {
      toast('error', "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  /** Save first, then trigger a fake DM so the merchant can see the new
   *  instructions in action. Race-free: real customer DMs after this point
   *  also benefit from the new instructions. */
  const saveAndTest = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({ name, aiInstructions: instructions });
      setData({ ...data, name: updated.name, aiInstructions: updated.aiInstructions });
      const res = await fetch('/api/backend/webhooks/meta/fake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageId: data.pages[0]?.externalPageId ?? 'page_rongdhonu',
          customerId: `fb_test_settings_${Date.now()}`,
          text: 'apa, delivery koto din lage? cod ase?',
        }),
      });
      if (!res.ok) throw new Error('test webhook failed');
      toast(
        'success',
        'Saved + sent a fake DM. Open the inbox to see how the AI replies with the new instructions.',
      );
    } catch {
      toast('error', "Couldn't run the test — saved, but the test DM didn't go through.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Settings"
      subtitle={`${data.productCount} products · ${data.pages.length} connected page${data.pages.length === 1 ? '' : 's'} · ${me.email}`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <JamdaniMark size={14} className="text-accent" />
            <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
              AI instructions
            </div>
          </div>
          <p className="mt-1 text-[13px] text-ink-2">
            Tell the AI about your tone, delivery rates, payment preferences, return policy — anything that should
            shape replies. Bangla, Banglish, English all OK.
          </p>
          <label className="mt-5 block">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">Shop name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              className="mt-1.5 w-full rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent disabled:opacity-60"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">Instructions</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={14}
              disabled={!canEdit}
              placeholder="e.g. Standard Dhaka delivery is ৳80. Cash on delivery fine under ৳3,000…"
              className="mt-1.5 w-full resize-y rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-accent disabled:opacity-60"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className={cn('text-[11px] uppercase tracking-[0.18em]', dirty ? 'text-amber' : 'text-ink-3')}>
              {!canEdit ? 'agents can read; admins/owners can edit' : dirty ? 'unsaved changes' : 'up to date'}
            </span>
            {canEdit && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveAndTest()}
                  disabled={!dirty || saving}
                  className="rounded-xl border border-border-2 bg-surface-2 px-4 py-2.5 font-display text-[14px] font-semibold text-ink transition hover:bg-surface-3 disabled:opacity-50"
                  title="Save and immediately send a fake DM so you can see how the AI replies."
                >
                  Save & test
                </button>
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <JamdaniMark size={14} className="text-accent" />
              <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                Catalog
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-ink-3">Source</dt>
              <dd className="font-semibold">{data.catalogSource ?? 'none'}</dd>
              <dt className="text-ink-3">Products</dt>
              <dd className="tabular-nums">{data.productCount}</dd>
              <dt className="text-ink-3">Status</dt>
              <dd className="font-semibold capitalize">{data.status}</dd>
            </dl>
          </section>

          <MembersSection currentRole={myRole} />
        </div>
      </div>
    </AppShell>
  );
}
