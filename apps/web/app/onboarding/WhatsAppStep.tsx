'use client';

import { Primary } from './Primary';

export function WhatsAppStep({
  value,
  onChange,
  onSave,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void | Promise<void>;
  onSkip: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
      className="space-y-3"
    >
      <input
        placeholder="+8801711000000"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
      />
      <div className="text-[12px] text-ink-3">
        We&apos;ll send a WhatsApp message when a customer needs you in person — complaints,
        refunds, or anything the AI can&apos;t resolve. Skip this if you&apos;d rather just use the
        inbox.
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-xl bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink-2"
        >
          Skip
        </button>
        <Primary>Save</Primary>
      </div>
    </form>
  );
}
