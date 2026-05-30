'use client';

import { Primary } from './Primary';

export function ConnectPageStep({
  pageId,
  setPageId,
  pageToken,
  setPageToken,
  onConnect,
}: {
  pageId: string;
  setPageId: (v: string) => void;
  pageToken: string;
  setPageToken: (v: string) => void;
  onConnect: (useSample: boolean) => void | Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onConnect(false);
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
        onClick={() => void onConnect(true)}
        className="w-full rounded-xl border border-dashed border-border-2 bg-surface-2 px-4 py-2.5 text-[14px] font-semibold text-ink-2 transition hover:bg-surface-3"
      >
        Skip — use the sample Page for now
      </button>
    </div>
  );
}
