'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { OnboardingStatus } from '@/lib/types';

type StepKey = 'shop' | 'page' | 'catalog' | 'ai' | 'whatsapp' | 'test' | 'done';

const STEPS: Array<{ key: StepKey; title: string; body: string }> = [
  { key: 'shop', title: 'Name your shop', body: "What customers will see in the AI's replies." },
  { key: 'page', title: 'Connect a Facebook Page', body: 'Or use the sample page to try it without Meta access.' },
  { key: 'catalog', title: 'Load your catalog', body: 'Upload a CSV, or seed the sample boutique to play.' },
  { key: 'ai', title: 'Teach the AI your voice', body: 'Tone, delivery rates, returns — anything you tell new staff.' },
  { key: 'whatsapp', title: 'Where should we ping you?', body: 'WhatsApp number for "Tahmina needs you" alerts.' },
  { key: 'test', title: 'Send yourself a test DM', body: 'See the AI reply to a fake customer in 5 seconds.' },
  { key: 'done', title: "You're live", body: 'Open the inbox and let Jobab run.' },
];

const SAMPLE_CSV = `external_id,title,description,price,currency,variant_external_id,variant_name,sku,variant_price,stock_qty
sample-saree,Sample Cotton Saree,light handloom cotton in red,1250,BDT,sample-saree-m,Medium · Red,SS-M-R,1250,6
sample-saree,Sample Cotton Saree,light handloom cotton in red,1250,BDT,sample-saree-l,Large · Red,SS-L-R,1250,3
`;

export function OnboardingClient({ initial }: { initial: OnboardingStatus | null }) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(initial);
  const [step, setStep] = useState<StepKey>('shop');

  const [shopName, setShopName] = useState('');
  const [pageId, setPageId] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [instructions, setInstructions] = useState(
    "Standard Dhaka delivery is ৳80. Cash on delivery fine under ৳3,000. Be warm. Use the customer's language.",
  );
  const [waPhone, setWaPhone] = useState('');
  const [testText, setTestText] = useState('lal jamdani shari ache?');
  const [testRunning, setTestRunning] = useState(false);
  // CSV preview state
  const [csvFile, setCsvFile] = useState<{ name: string; content: string; rows: string[][] } | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  // Track whether the user has interacted; without it, we'd ping-pong the
  // step state on every status refresh.
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!status || touched) return;
    if (!status.pageConnected) setStep('shop');
    else if (!status.catalogLoaded) goto('catalog');
    else if (!status.aiInstructionsSet) goto('ai');
    else goto('test');
  }, [status, touched]);

  // Auto-redirect home when the merchant lands on 'done'.
  useEffect(() => {
    if (step !== 'done') return;
    const t = setTimeout(() => router.replace('/inbox'), 2500);
    return () => clearTimeout(t);
  }, [step, router]);

  const goto = (k: StepKey) => {
    setTouched(true);
    setStep(k);
  };
  const back = () => {
    setTouched(true);
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  const refresh = async () => {
    try { setStatus(await api.onboardingStatus()); } catch {}
  };

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progress = useMemo(() => Math.round((stepIdx / (STEPS.length - 1)) * 100), [stepIdx]);

  const saveShopName = async () => {
    if (!shopName.trim()) return goto('page');
    try {
      await api.updateSettings({ name: shopName.trim() });
      goto('page');
    } catch {
      toast('error', "Couldn't save name.");
    }
  };

  const connectPage = async (useSample: boolean) => {
    if (useSample) {
      goto('catalog');
      await refresh();
      return;
    }
    if (!pageId || !pageToken) return;
    try {
      await api.connectPage({ externalPageId: pageId, accessToken: pageToken });
      toast('success', 'Page connected.');
      goto('catalog');
      await refresh();
    } catch {
      toast('error', "Couldn't connect — verify the Page ID + token.");
    }
  };

  const seedSampleCatalog = async () => {
    try {
      const res = await api.syncCsv(SAMPLE_CSV);
      toast('success', `Synced ${res.products} sample product${res.products === 1 ? '' : 's'}.`);
      goto('ai');
      await refresh();
    } catch {
      toast('error', "Couldn't load sample catalog.");
    }
  };

  const previewCsv = async (file: File) => {
    try {
      const content = await file.text();
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rows = lines.slice(0, 4).map((l) => splitCsvRow(l));
      setCsvFile({ name: file.name, content, rows });
    } catch {
      toast('error', "Couldn't read that file.");
    }
  };

  const confirmCsvUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const res = await api.syncCsv(csvFile.content);
      toast('success', `Synced ${res.products} products.`);
      setCsvFile(null);
      goto('ai');
      await refresh();
    } catch {
      toast('error', 'CSV import failed — check the format.');
    } finally {
      setCsvUploading(false);
    }
  };

  const saveInstructions = async () => {
    if (!instructions.trim()) return;
    try {
      await api.updateSettings({ aiInstructions: instructions.trim() });
      goto('whatsapp');
      await refresh();
    } catch {
      toast('error', "Couldn't save instructions.");
    }
  };

  const saveWhatsApp = async () => {
    if (waPhone) {
      try {
        await api.updateSettings({ notificationPhone: waPhone });
      } catch {
        toast('error', "Use E.164 format, e.g. +8801711000000");
        return;
      }
    }
    goto('test');
  };

  const sendTestDm = async () => {
    setTestRunning(true);
    try {
      const res = await fetch('/api/backend/webhooks/meta/fake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageId: 'page_rongdhonu',
          customerId: `fb_onboard_${Date.now()}`,
          text: testText,
        }),
      });
      if (!res.ok) throw new Error('fake webhook ' + res.status);
      toast('success', 'Test DM sent. The AI will reply within ~3 seconds.');
      setTimeout(() => goto('done'), 2500);
    } catch {
      toast('error', "Couldn't send the test — is the backend up?");
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <AppShell
      title="Onboarding"
      subtitle={status?.ready ? '✓ Live' : `Step ${stepIdx + 1} of ${STEPS.length}`}
      actions={
        status?.ready && (
          <Link href="/inbox" className="rounded-full bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-110">
            Open inbox →
          </Link>
        )
      }
    >
      <div className="mb-6">
        <div className="flex justify-between text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          {STEPS.map((s, i) => (
            <span key={s.key} className={cn(i <= stepIdx ? 'text-accent-ink' : '')}>
              {i + 1}
            </span>
          ))}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="rounded-2xl border border-border bg-surface p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <JamdaniMark size={14} className="text-accent" />
              <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                {STEPS[stepIdx]?.title}
              </div>
            </div>
            <p className="mt-1 text-[14px] text-ink-2">{STEPS[stepIdx]?.body}</p>
          </div>
          {stepIdx > 0 && step !== 'done' && (
            <button
              type="button"
              onClick={back}
              className="rounded-md px-2 py-1 text-[12px] font-semibold text-ink-2 transition hover:bg-surface-2 hover:text-ink"
            >
              ← Back
            </button>
          )}
        </div>

        <div className="mt-5">
          {step === 'shop' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveShopName();
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                placeholder="e.g. Rongdhonu Boutique"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="flex-1 rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
              />
              <Primary>Continue</Primary>
            </form>
          )}

          {step === 'page' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void connectPage(false);
                }}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  placeholder="Page ID"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  className="rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[14px] outline-none focus:border-accent"
                />
                <input
                  type="password"
                  placeholder="Page access token"
                  value={pageToken}
                  onChange={(e) => setPageToken(e.target.value)}
                  className="rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[14px] outline-none focus:border-accent"
                />
                <Primary disabled={!pageId || !pageToken}>Connect</Primary>
              </form>
              <div className="text-center text-[12px] uppercase tracking-[0.18em] text-ink-3">— or —</div>
              <button
                onClick={() => void connectPage(true)}
                className="w-full rounded-xl border border-dashed border-border-2 bg-surface-2 px-4 py-2.5 text-[14px] font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                Skip — use the sample Page for now
              </button>
            </div>
          )}

          {step === 'catalog' && !csvFile && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-2 p-6 text-center transition hover:bg-surface-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-ink-3">
                  Upload CSV
                </span>
                <span className="text-[13px] text-ink-2">click to choose a file</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void previewCsv(f);
                  }}
                />
              </label>
              <button
                onClick={seedSampleCatalog}
                className="flex flex-col items-center gap-2 rounded-xl border border-border-2 bg-surface-2 p-6 text-center transition hover:bg-surface-3"
              >
                <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                  Try with samples
                </span>
                <span className="text-[13px] text-ink-2">a 1-product CSV we ship for demos</span>
              </button>
            </div>
          )}

          {step === 'catalog' && csvFile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[12.5px] text-ink-2">
                  <span className="font-semibold">{csvFile.name}</span> · first {csvFile.rows.length - 1} row{csvFile.rows.length - 1 === 1 ? '' : 's'} preview
                </div>
                <button
                  type="button"
                  onClick={() => setCsvFile(null)}
                  className="text-[12px] font-semibold text-ink-2 hover:text-ink"
                >
                  ✕ choose different file
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border-2 bg-surface-2">
                <table className="w-full text-[12px]">
                  <thead className="border-b border-border-2 bg-surface-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">
                    <tr>
                      {csvFile.rows[0]?.map((h, i) => (
                        <th key={i} className="px-2 py-2 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvFile.rows.slice(1).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="truncate px-2 py-1.5 text-ink">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCsvFile(null)}
                  className="rounded-xl bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmCsvUpload()}
                  disabled={csvUploading}
                  className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                >
                  {csvUploading ? 'Syncing…' : 'Looks right — import'}
                </button>
              </div>
            </div>
          )}

          {step === 'ai' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveInstructions();
              }}
              className="space-y-3"
            >
              <textarea
                rows={8}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full resize-y rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-accent"
              />
              <div className="flex justify-end">
                <Primary disabled={!instructions.trim()}>Save and continue</Primary>
              </div>
            </form>
          )}

          {step === 'whatsapp' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveWhatsApp();
              }}
              className="space-y-3"
            >
              <input
                placeholder="+8801711000000"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="w-full rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
              />
              <div className="text-[12px] text-ink-3">
                We'll send a WhatsApp message when a customer needs you in person — complaints,
                refunds, or anything the AI can't resolve. Skip this if you'd rather just use the
                inbox.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => goto('test')}
                  className="rounded-xl bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink-2"
                >
                  Skip
                </button>
                <Primary>Save</Primary>
              </div>
            </form>
          )}

          {step === 'test' && (
            <div className="space-y-3">
              <p className="text-[13.5px] text-ink-2">
                We'll send a fake customer DM. The AI will reply in the inbox within a few seconds.
              </p>
              <input
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void sendTestDm()}
                  disabled={testRunning || !testText.trim()}
                  className="rounded-xl bg-accent px-4 py-2.5 font-display text-[15px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                >
                  {testRunning ? 'Sending…' : 'Send test DM'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-3 text-center">
              <div className="font-display text-[28px] font-bold tracking-display text-accent">
                You're live 🌸
              </div>
              <p className="text-[14px] text-ink-2">
                Jobab is now answering DMs for you. Check the inbox to see the test reply land.
              </p>
              <button
                onClick={() => router.push('/inbox')}
                className="rounded-xl bg-accent px-5 py-3 font-display text-[15px] font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Open inbox
              </button>
            </div>
          )}
        </div>
      </article>
    </AppShell>
  );
}

/** Minimal CSV splitter for the preview — handles quoted commas. Production
 *  imports still go through the backend's catalog adapter. */
function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function Primary({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
