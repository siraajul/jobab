'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Note } from '@/lib/types';
import { useToast } from '@/components/shared/Toast';
import { Skeleton } from '@/components/shared/Skeleton';

/** Internal notes on a conversation — add, list, delete. Mounts inside a
 *  collapsed Section, so the fetch defers until the merchant opens it. */
export function NotesPanel({ conversationId }: { conversationId: string }) {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNotes(null);
    api
      .conversationNotes(conversationId)
      .then((rows) => !cancelled && setNotes(rows))
      .catch(() => !cancelled && setNotes([]));
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const add = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const note = await api.addConversationNote(conversationId, body);
      setNotes((prev) => [note, ...(prev ?? [])]);
      setDraft('');
    } catch {
      toast('error', "Couldn't save the note — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const prev = notes;
    setNotes((ns) => (ns ?? []).filter((n) => n.id !== id));
    try {
      await api.deleteConversationNote(conversationId, id);
    } catch {
      setNotes(prev ?? []);
      toast('error', "Couldn't delete the note.");
    }
  };

  return (
    <div className="px-5 pb-2">
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add();
          }}
          rows={2}
          placeholder="Add an internal note… (⌘↵)"
          className="min-h-[40px] flex-1 resize-y rounded-lg border border-border-2 bg-surface-2 px-2.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || busy}
          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[13px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-3"
        >
          Add
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {notes === null ? (
          <>
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </>
        ) : notes.length === 0 ? (
          <p className="text-[13px] text-ink-3">No notes yet. Jot down anything the team should know.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="group rounded-lg border border-border bg-surface p-2.5">
              <p className="whitespace-pre-wrap break-words text-[13px] text-ink">{n.body}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] uppercase tracking-wider text-ink-3">
                <span className="truncate">
                  {n.authorName ?? 'Someone'} · {formatTime(n.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="shrink-0 opacity-0 transition hover:text-red group-hover:opacity-100"
                  aria-label="Delete note"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
