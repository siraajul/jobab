'use client';

import { useState } from 'react';
import type { ProductVariant } from '@/lib/types';

/**
 * Inline editor for one variant's stock quantity.
 * Stateless w.r.t. catalog data — bubble changes up via `onChange`.
 */
export function VariantRow({
  variant,
  onChange,
}: {
  variant: ProductVariant;
  onChange: (id: string, qty: number) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<string>(String(variant.stockQty));
  const [saving, setSaving] = useState(false);

  const dirty = draft.trim() !== String(variant.stockQty);

  const commit = async (qty: number) => {
    if (qty === variant.stockQty) return;
    setSaving(true);
    try {
      await onChange(variant.id, qty);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const parsed = Math.max(0, Math.floor(Number(draft)));
    if (!Number.isFinite(parsed)) return;
    setDraft(String(parsed));
    await commit(parsed);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-ink">{variant.name}</div>
        <div className="truncate text-[11px] text-ink-3">
          {variant.sku ?? '—'} · ৳{Number(variant.price).toLocaleString()}
        </div>
      </div>
      <button
        type="button"
        onClick={() => commit(0)}
        disabled={saving || variant.stockQty === 0}
        title="Mark out of stock"
        className="shrink-0 rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-[11px] font-semibold text-amber transition hover:bg-amber-bg disabled:opacity-40"
      >
        OOS
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void handleSave();
          }
        }}
        className="w-16 shrink-0 rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-right text-[13px] tabular-nums outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
      >
        {saving ? '…' : 'Save'}
      </button>
    </div>
  );
}
