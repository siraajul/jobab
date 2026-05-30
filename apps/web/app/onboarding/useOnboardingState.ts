'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import type { OnboardingStatus } from '@/lib/types';

export type StepKey = 'shop' | 'page' | 'catalog' | 'ai' | 'whatsapp' | 'test' | 'done';

export const STEPS: Array<{ key: StepKey; title: string; body: string }> = [
  { key: 'shop', title: 'Name your shop', body: "What customers will see in the AI's replies." },
  {
    key: 'page',
    title: 'Connect a Facebook Page',
    body: 'Or use the sample page to try it without Meta access.',
  },
  {
    key: 'catalog',
    title: 'Load your catalog',
    body: 'Upload a CSV, or seed the sample boutique to play.',
  },
  {
    key: 'ai',
    title: 'Teach the AI your voice',
    body: 'Tone, delivery rates, returns — anything you tell new staff.',
  },
  {
    key: 'whatsapp',
    title: 'Where should we ping you?',
    body: 'WhatsApp number for "Tahmina needs you" alerts.',
  },
  {
    key: 'test',
    title: 'Send yourself a test DM',
    body: 'See the AI reply to a fake customer in 5 seconds.',
  },
  { key: 'done', title: "You're live", body: 'Open the inbox and let Jobab run.' },
];

const SAMPLE_CSV = `external_id,title,description,price,currency,variant_external_id,variant_name,sku,variant_price,stock_qty
sample-saree,Sample Cotton Saree,light handloom cotton in red,1250,BDT,sample-saree-m,Medium · Red,SS-M-R,1250,6
sample-saree,Sample Cotton Saree,light handloom cotton in red,1250,BDT,sample-saree-l,Large · Red,SS-L-R,1250,3
`;

export interface CsvFile {
  name: string;
  content: string;
  rows: string[][];
}

/**
 * All onboarding-wizard state + mutations.
 *
 * The orchestrator (`OnboardingClient`) renders the progress bar / header /
 * back button and delegates each step to a focused component (`ShopNameStep`,
 * `ConnectPageStep`, …). Every step receives the slice of state it needs from
 * this hook — no step talks to the API directly.
 */
export function useOnboardingState(initial: OnboardingStatus | null) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(initial);
  const [step, setStep] = useState<StepKey>('shop');

  // Form state for every step. Kept together so the hook returns one object
  // the orchestrator can spread into props.
  const [shopName, setShopName] = useState('');
  const [pageId, setPageId] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [instructions, setInstructions] = useState(
    "Standard Dhaka delivery is ৳80. Cash on delivery fine under ৳3,000. Be warm. Use the customer's language.",
  );
  const [waPhone, setWaPhone] = useState('');
  const [testText, setTestText] = useState('lal jamdani shari ache?');
  const [testRunning, setTestRunning] = useState(false);
  const [csvFile, setCsvFile] = useState<CsvFile | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  // Track whether the user has interacted; without it, we'd ping-pong the
  // step state on every status refresh.
  const [touched, setTouched] = useState(false);

  // Resume the wizard at the earliest unfinished step, but only until the user
  // first interacts. After that, manual navigation wins.
  useEffect(() => {
    if (!status || touched) return;
    if (!status.pageConnected) setStep('shop');
    else if (!status.catalogLoaded) setStep('catalog');
    else if (!status.aiInstructionsSet) setStep('ai');
    else setStep('test');
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
    try {
      setStatus(await api.onboardingStatus());
    } catch {
      /* offline */
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progress = useMemo(() => Math.round((stepIdx / (STEPS.length - 1)) * 100), [stepIdx]);

  // --- step actions -----------------------------------------------------

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

  /** Called by ConnectPageStep after the OAuth picker finishes upserting pages. */
  const onOAuthPagesConnected = async () => {
    goto('catalog');
    await refresh();
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
        toast('error', 'Use E.164 format, e.g. +8801711000000');
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

  return {
    status,
    step,
    stepIdx,
    progress,
    goto,
    back,
    router,
    // step props — shaped to match each step's component contract
    shop: { shopName, setShopName, save: saveShopName },
    page: {
      pageId,
      setPageId,
      pageToken,
      setPageToken,
      connect: connectPage,
      onOAuthConnected: onOAuthPagesConnected,
    },
    catalog: {
      csvFile,
      setCsvFile,
      uploading: csvUploading,
      preview: previewCsv,
      confirmUpload: confirmCsvUpload,
      seedSample: seedSampleCatalog,
    },
    ai: { instructions, setInstructions, save: saveInstructions },
    whatsapp: { waPhone, setWaPhone, save: saveWhatsApp, skip: () => goto('test') },
    test: { testText, setTestText, running: testRunning, send: sendTestDm },
  };
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
