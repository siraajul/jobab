'use client';

import { Primary } from './Primary';

export function AiInstructionsStep({
  value,
  onChange,
  onSave,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void | Promise<void>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
      className="space-y-3"
    >
      <textarea
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-accent"
      />
      <div className="flex justify-end">
        <Primary disabled={!value.trim()}>Save and continue</Primary>
      </div>
    </form>
  );
}
