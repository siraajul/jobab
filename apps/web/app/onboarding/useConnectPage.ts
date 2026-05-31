'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';

export type FacebookPage = {
  pageId: string;
  name: string;
  category: string | null;
  instagramBusinessAccountId: string | null;
  instagramUsername: string | null;
};

/**
 * All connect-page side effects: detect OAuth availability, react to the
 * post-callback `?fb=connected` / `?fb=error` query, kick off OAuth, load the
 * page picker, and connect the picked pages. ConnectPageStep consumes this
 * hook and renders the UI; it does no API work itself.
 */
export function useConnectPage(onPagesConnected: () => void | Promise<void>) {
  const toast = useToast();
  const [oauthEnabled, setOauthEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  // After OAuth: populated with the merchant's pages; rendered as a picker.
  const [pages, setPages] = useState<FacebookPage[] | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [includeInstagram, setIncludeInstagram] = useState(true);

  // Detect OAuth availability once at mount.
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

  // Handle the post-callback ?fb=connected / ?fb=error param.
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

  const togglePicked = (pageId: string, checked: boolean) =>
    setPicked((s) => ({ ...s, [pageId]: checked }));

  const cancelPicker = () => setPages(null);

  return {
    oauthEnabled,
    busy,
    pages,
    picked,
    includeInstagram,
    setIncludeInstagram,
    beginOAuth,
    connectPicked,
    togglePicked,
    cancelPicker,
  };
}
