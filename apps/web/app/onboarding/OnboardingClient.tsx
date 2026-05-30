'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { cn } from '@/lib/cn';
import type { OnboardingStatus } from '@/lib/types';
import { AiInstructionsStep } from './AiInstructionsStep';
import { CatalogStep } from './CatalogStep';
import { ConnectPageStep } from './ConnectPageStep';
import { DoneStep } from './DoneStep';
import { ShopNameStep } from './ShopNameStep';
import { STEPS, useOnboardingState } from './useOnboardingState';
import { TestStep } from './TestStep';
import { WhatsAppStep } from './WhatsAppStep';

/**
 * Onboarding-wizard orchestrator.
 *
 * This component owns layout only: header, progress bar, back button, and a
 * switch that picks which step to render. State / mutations live in
 * `useOnboardingState`; each step has its own focused component
 * (`ShopNameStep`, `CatalogStep`, …) that receives just the slice of state it
 * needs as props.
 */
export function OnboardingClient({ initial }: { initial: OnboardingStatus | null }) {
  const s = useOnboardingState(initial);

  return (
    <AppShell
      title="Onboarding"
      subtitle={s.status?.ready ? '✓ Live' : `Step ${s.stepIdx + 1} of ${STEPS.length}`}
      actions={
        s.status?.ready && (
          <Link
            href="/inbox"
            className="rounded-full bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Open inbox →
          </Link>
        )
      }
    >
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          {STEPS.map((step, i) => (
            <span key={step.key} className={cn(i <= s.stepIdx ? 'text-accent-ink' : '')}>
              {i + 1}
            </span>
          ))}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${s.progress}%` }} />
        </div>
      </div>

      <article className="rounded-2xl border border-border bg-surface p-5 shadow-md sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <JamdaniMark size={14} className="shrink-0 text-accent" />
              <div className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-accent-ink sm:text-[14px]">
                {STEPS[s.stepIdx]?.title}
              </div>
            </div>
            <p className="mt-1 text-[14px] text-ink-2">{STEPS[s.stepIdx]?.body}</p>
          </div>
          {s.stepIdx > 0 && s.step !== 'done' && (
            <button
              type="button"
              onClick={s.back}
              className="shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold text-ink-2 transition hover:bg-surface-2 hover:text-ink"
            >
              ← Back
            </button>
          )}
        </div>

        <div className="mt-5">
          {s.step === 'shop' && (
            <ShopNameStep
              value={s.shop.shopName}
              onChange={s.shop.setShopName}
              onSave={s.shop.save}
            />
          )}
          {s.step === 'page' && (
            <ConnectPageStep
              pageId={s.page.pageId}
              setPageId={s.page.setPageId}
              pageToken={s.page.pageToken}
              setPageToken={s.page.setPageToken}
              onConnect={s.page.connect}
              onPagesConnected={s.page.onOAuthConnected}
            />
          )}
          {s.step === 'catalog' && (
            <CatalogStep
              csvFile={s.catalog.csvFile}
              uploading={s.catalog.uploading}
              onPickFile={s.catalog.preview}
              onCancel={() => s.catalog.setCsvFile(null)}
              onConfirm={s.catalog.confirmUpload}
              onSeedSample={s.catalog.seedSample}
            />
          )}
          {s.step === 'ai' && (
            <AiInstructionsStep
              value={s.ai.instructions}
              onChange={s.ai.setInstructions}
              onSave={s.ai.save}
            />
          )}
          {s.step === 'whatsapp' && (
            <WhatsAppStep
              value={s.whatsapp.waPhone}
              onChange={s.whatsapp.setWaPhone}
              onSave={s.whatsapp.save}
              onSkip={s.whatsapp.skip}
            />
          )}
          {s.step === 'test' && (
            <TestStep
              text={s.test.testText}
              setText={s.test.setTestText}
              running={s.test.running}
              onSend={s.test.send}
            />
          )}
          {s.step === 'done' && <DoneStep onOpenInbox={() => s.router.push('/inbox')} />}
        </div>
      </article>
    </AppShell>
  );
}
