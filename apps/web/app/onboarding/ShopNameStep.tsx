'use client';

import { Primary } from './Primary';

export function ShopNameStep({
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
      className="flex flex-col gap-3 sm:flex-row"
    >
      <input
        placeholder="e.g. Rongdhonu Boutique"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
      />
      <Primary>Continue</Primary>
    </form>
  );
}
