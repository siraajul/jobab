'use client';

import { useState } from 'react';
import { Primary } from './Primary';
import { FacebookPagePicker } from './FacebookPagePicker';
import { useConnectPage } from './useConnectPage';

/**
 * Connect-page step with three modes:
 *   1. **OAuth** (preferred) — "Connect with Facebook" button kicks off the
 *      OAuth flow. After callback, FacebookPagePicker lets the merchant choose
 *      which page(s) to connect. Linked Instagram accounts come along for the
 *      ride. Only shown when META_APP_ID is set on the backend.
 *   2. **Manual** (fallback) — Page ID + access token paste form. Lives behind
 *      an "Advanced" disclosure so it doesn't fight the OAuth CTA for attention.
 *   3. **Sample** — skip with the seeded `page_rongdhonu` for demos.
 *
 * The OAuth-return state (`?fb=connected` / `?fb=error`) is handled inside
 * useConnectPage; this component just renders the right branch.
 */
export function ConnectPageStep({
  pageId,
  setPageId,
  pageToken,
  setPageToken,
  onConnect,
  onPagesConnected,
}: {
  pageId: string;
  setPageId: (v: string) => void;
  pageToken: string;
  setPageToken: (v: string) => void;
  onConnect: (useSample: boolean) => void | Promise<void>;
  /** Called after OAuth connect succeeds — parent advances to the next wizard step. */
  onPagesConnected: () => void | Promise<void>;
}) {
  const oauth = useConnectPage(onPagesConnected);
  const [showManual, setShowManual] = useState(false);

  if (oauth.pages) {
    return (
      <FacebookPagePicker
        pages={oauth.pages}
        picked={oauth.picked}
        includeInstagram={oauth.includeInstagram}
        busy={oauth.busy}
        onToggle={oauth.togglePicked}
        onIncludeInstagramChange={oauth.setIncludeInstagram}
        onConnect={oauth.connectPicked}
        onCancel={oauth.cancelPicker}
      />
    );
  }

  return (
    <div className="space-y-4">
      {oauth.oauthEnabled && (
        <button
          type="button"
          disabled={oauth.busy}
          onClick={() => void oauth.beginOAuth()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
        >
          <FacebookF />
          {oauth.busy ? 'Redirecting…' : 'Connect with Facebook'}
        </button>
      )}

      {!showManual && (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="w-full rounded-xl border border-dashed border-border-2 bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition hover:bg-surface-3"
        >
          {oauth.oauthEnabled
            ? 'Advanced — paste Page ID + token manually'
            : 'Paste Page ID + token'}
        </button>
      )}

      {showManual && (
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
      )}

      <div className="text-center text-[12px] uppercase tracking-[0.18em] text-ink-3">— or —</div>
      <button
        type="button"
        onClick={() => void onConnect(true)}
        className="w-full rounded-xl border border-dashed border-border-2 bg-surface-2 px-4 py-2.5 text-[14px] font-semibold text-ink-2 transition hover:bg-surface-3"
      >
        Skip — use the sample Page for now
      </button>
    </div>
  );
}

function FacebookF() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}
