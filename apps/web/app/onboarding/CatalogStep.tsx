'use client';

import type { CsvFile } from './useOnboardingState';

export function CatalogStep({
  csvFile,
  uploading,
  onPickFile,
  onCancel,
  onConfirm,
  onSeedSample,
}: {
  csvFile: CsvFile | null;
  uploading: boolean;
  onPickFile: (file: File) => void | Promise<void>;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  onSeedSample: () => void | Promise<void>;
}) {
  // Picker (no file chosen yet) vs preview (file chosen, awaiting confirmation).
  if (!csvFile) {
    return (
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
              if (f) void onPickFile(f);
            }}
          />
        </label>
        <button
          onClick={() => void onSeedSample()}
          className="flex flex-col items-center gap-2 rounded-xl border border-border-2 bg-surface-2 p-6 text-center transition hover:bg-surface-3"
        >
          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent-ink">
            Try with samples
          </span>
          <span className="text-[13px] text-ink-2">a 1-product CSV we ship for demos</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-[12.5px] text-ink-2">
          <span className="font-semibold">{csvFile.name}</span> · first {csvFile.rows.length - 1}{' '}
          row{csvFile.rows.length - 1 === 1 ? '' : 's'} preview
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-[12px] font-semibold text-ink-2 hover:text-ink"
        >
          ✕ choose different file
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border-2 bg-surface-2">
        <table className="min-w-[640px] text-[12px]">
          <thead className="border-b border-border-2 bg-surface-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">
            <tr>
              {csvFile.rows[0]?.map((h, i) => (
                <th key={i} className="whitespace-nowrap px-2 py-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvFile.rows.slice(1).map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="max-w-[240px] truncate px-2 py-1.5 text-ink" title={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={uploading}
          className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {uploading ? 'Syncing…' : 'Looks right — import'}
        </button>
      </div>
    </div>
  );
}
