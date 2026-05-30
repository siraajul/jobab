'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import { Primary } from './Primary';

type FacebookPage = {
  pageId: string;
  name: string;
  category: string | null;
  instagramBusinessAccountId: string | null;
  instagramUsername: string | null;
};

/**
 * Connect-page step with three modes:
 *   1. **OAuth** (preferred) — "Connect with Facebook" button kicks off the
 *      OAuth flow. After callback, we render a picker so the merchant chooses
 *      which page(s) to connect. Linked Instagram accounts come along for the
 *      ride. Only shown when META_APP_ID is set on the backend.
 *   2. **Manual** (fallback) — Page ID + access token paste form. Lives behind
 *      an "Advanced" disclosure so it doesn't fight the OAuth CTA for attention.
 *   3. **Sample** — skip with the seeded `page_rongdhonu` for demos.
 *
 * The OAuth-return state (`?fb=connected` / `?fb=error`) is set by the
 * `/onboarding/callback` route bouncing back into `/onboarding`.
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
  const toast = useToast();
  const [oauthEnabled, setOauthEnabled] = useState<boolean | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState(false);

  // After OAuth: populated with the merchant's pages; rendered as a picker.
  const [pages, setPages] = useState<FacebookPage[] | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [includeInstagram, setIncludeInstagram] = useState(true);

  // Detect OAuth availability + handle the post-callback ?fb=connected param.
  useEffect(() => {
    let cancelled = false;
    void api
      .oauthConfig()
      .then((cfg) => {
        if (!cancelled) setOauthEnabled(cfg.facebookEnabled);
      })
      .catch(() => {
        if (!cancelled) setOauthEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fb = params.get('fb');
    if (fb === 'connected') {
      void loadPages();
      // Clean the query so a refresh doesn't re-trigger.
      window.history.replaceState(null, '', window.location.pathname);
    } else if (fb === 'error') {
      const reason = params.get('reason') ?? 'unknown';
      toast('error', `Facebook connect failed: ${reason}`);
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginOAuth = async () => {
    setBusy(true);
    try {
      const { url } = await api.startFacebookOAuth();
      window.location.href = url;
    } catch {
      toast('error', "Couldn't start Facebook login. Is META_APP_ID set?");
      setBusy(false);
    }
  };

  const loadPages = async () => {
    setBusy(true);
    try {
      const { pages } = await api.listFacebookPages();
      setPages(pages);
      // Default-pick the first page so the merchant can one-click "Connect 1 page".
      if (pages.length > 0) setPicked({ [pages[0].pageId]: true });
    } catch {
      toast('error', "Couldn't load your Facebook pages. Try the connect button again.");
    } finally {
      setBusy(false);
    }
  };

  const connectPicked = async () => {
    const pageIds = Object.keys(picked).filter((id) => picked[id]);
    if (pageIds.length === 0) {
      toast('error', 'Pick at least one page.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.connectFacebookPages({ pageIds, includeInstagram });
      const n = res.connected.length;
      toast('success', `Connected ${n} channel${n === 1 ? '' : 's'}.`);
      setPages(null);
      await onPagesConnected();
    } catch {
      toast('error', 'Connect failed. Restart the flow and try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── render the page picker once we have pages ──────────────────────
  if (pages) {
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
                  onChange={(e) => setPicked((s) => ({ ...s, [p.pageId]: e.target.checked }))}
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
            onChange={(e) => setIncludeInstagram(e.target.checked)}
          />
          Also connect linked Instagram accounts
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || Object.values(picked).every((v) => !v)}
            onClick={() => void connectPicked()}
            className="rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Connecting…' : 'Connect selected'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPages(null)}
            className="rounded-xl border border-border-2 bg-surface-2 px-4 py-2.5 text-[14px] font-semibold text-ink-2 transition hover:bg-surface-3"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── render the initial choices ─────────────────────────────────────
  return (
    <div className="space-y-4">
      {oauthEnabled && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void beginOAuth()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
        >
          <FacebookF />
          {busy ? 'Redirecting…' : 'Connect with Facebook'}
        </button>
      )}

      {!showManual && (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="w-full rounded-xl border border-dashed border-border-2 bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition hover:bg-surface-3"
        >
          {oauthEnabled ? 'Advanced — paste Page ID + token manually' : 'Paste Page ID + token'}
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
