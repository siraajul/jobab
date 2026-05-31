import type { FacebookPage } from './useConnectPage';

/**
 * The post-OAuth picker: a checklist of Facebook pages the merchant manages
 * + an "also connect linked Instagram accounts" toggle + connect / cancel.
 * Pure UI; the parent owns the picked-state and the connect handler.
 */
export function FacebookPagePicker({
  pages,
  picked,
  includeInstagram,
  busy,
  onToggle,
  onIncludeInstagramChange,
  onConnect,
  onCancel,
}: {
  pages: FacebookPage[];
  picked: Record<string, boolean>;
  includeInstagram: boolean;
  busy: boolean;
  onToggle: (pageId: string, checked: boolean) => void;
  onIncludeInstagramChange: (value: boolean) => void;
  onConnect: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const nothingPicked = Object.values(picked).every((v) => !v);
  return (
    <div className="space-y-4">
      <div className="text-[13px] text-ink-2">
        Pick which {pages.length === 1 ? 'page' : 'pages'} Jobab should answer DMs for.
      </div>
      <ul className="space-y-2">
        {pages.map((p) => {
          const checked = !!picked[p.pageId];
          return (
            <li
              key={p.pageId}
              className="flex items-start gap-3 rounded-[11px] border border-border-2 bg-surface-2 p-3"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-accent"
                checked={checked}
                onChange={(e) => onToggle(p.pageId, e.target.checked)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{p.name}</div>
                <div className="text-[12px] text-ink-3">
                  {p.category ?? 'Facebook Page'} · {p.pageId}
                </div>
                {p.instagramBusinessAccountId && (
                  <div className="mt-1 text-[12px] text-accent-ink">
                    ↳ Instagram: @{p.instagramUsername ?? p.instagramBusinessAccountId}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent"
          checked={includeInstagram}
          onChange={(e) => onIncludeInstagramChange(e.target.checked)}
        />
        Also connect linked Instagram accounts
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || nothingPicked}
          onClick={() => void onConnect()}
          className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Connecting…' : 'Connect selected'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl border border-border-2 bg-surface-2 px-4 py-2.5 text-[14px] font-semibold text-ink-2 transition hover:bg-surface-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
