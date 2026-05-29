'use client';

import { useEffect, useRef, useState } from 'react';
import type { ConversationStatus } from '@/lib/types';

const MAX_HEIGHT = 200;

export function Composer({
  status,
  onSend,
  thinking = false,
  aiDraft = null,
}: {
  status: ConversationStatus;
  onSend: (text: string) => Promise<void> | void;
  /** When true, render a calm "AI is thinking" hint above the disabled bar. */
  thinking?: boolean;
  /** The AI's last outgoing message — offered as a "Use AI draft" shortcut. */
  aiDraft?: string | null;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const aiHandling = status === 'bot';

  // Auto-grow the textarea up to MAX_HEIGHT.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + 'px';
  }, [value]);

  if (aiHandling) {
    return (
      <div className="border-t border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center justify-center gap-2 px-3 py-2 text-[13.5px] text-ink-2">
          <span className="inline-flex h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent" />
          {thinking ? 'AI is thinking…' : 'AI is handling — take over to reply yourself.'}
        </div>
      </div>
    );
  }

  const submit = async () => {
    const text = value.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onSend(text);
      setValue('');
    } finally {
      setBusy(false);
    }
  };

  const useAiDraft = () => {
    if (aiDraft) {
      setValue(aiDraft);
      ref.current?.focus();
    }
  };

  return (
    <div className="border-t border-border bg-surface px-3 py-3 sm:px-6">
      {aiDraft && !value.trim() && (
        <button
          type="button"
          onClick={useAiDraft}
          className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent-ink transition hover:brightness-95"
          title="Drop the AI's last reply into the box to edit"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.39 6.61L21 11l-6.61 2.39L12 20l-2.39-6.61L3 11l6.61-2.39L12 2z" />
          </svg>
          Use AI draft
        </button>
      )}
      <div className="flex items-end gap-2.5 rounded-[22px] border border-border-2 bg-surface-2 py-2 pl-4 pr-2">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a reply… (Shift+Enter for newline)"
          className="flex-1 resize-none bg-transparent py-1 text-[15px] leading-snug text-ink outline-none placeholder:text-ink-3"
          style={{ maxHeight: MAX_HEIGHT }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          aria-label="Send"
        >
          {busy ? <Spinner /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M3 12l18-9-4 9 4 9-18-9z" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  );
}
