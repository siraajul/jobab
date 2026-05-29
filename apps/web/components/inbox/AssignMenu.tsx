'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { MemberRow } from '@/lib/api';

/** "Assign agent" control for the thread header. Shows the current assignee and
 *  lets the merchant route the conversation to a teammate (or unassign). */
export function AssignMenu({
  members,
  assignedUserId,
  onAssign,
}: {
  members: MemberRow[];
  assignedUserId: string | null | undefined;
  onAssign: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = members.find((m) => m.user.id === assignedUserId);
  const currentLabel = current ? (current.user.name ?? current.user.email) : null;

  const pick = (userId: string | null) => {
    setOpen(false);
    onAssign(userId);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition',
          currentLabel
            ? 'border-you/40 bg-you/10 text-you'
            : 'border-border-2 bg-surface text-ink-2 hover:bg-surface-2',
        )}
      >
        <PersonPlusIcon />
        <span className="max-w-[9rem] truncate normal-case tracking-normal">
          {currentLabel ?? 'Assign'}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="listbox"
            className="absolute right-0 z-40 mt-1.5 max-h-72 w-60 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">
              Assign to
            </div>
            {members.length === 0 && (
              <div className="px-2.5 py-2 text-[12.5px] text-ink-3">No teammates yet.</div>
            )}
            {members.map((m) => {
              const label = m.user.name ?? m.user.email;
              const selected = m.user.id === assignedUserId;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(m.user.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition hover:bg-surface-2',
                    selected && 'bg-surface-2',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {label}
                    <span className="ml-1.5 text-[11px] uppercase tracking-wider text-ink-3">
                      {m.role}
                    </span>
                  </span>
                  {selected && <CheckIcon />}
                </button>
              );
            })}
            {assignedUserId && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2.5 py-2 text-left text-[13px] text-ink-2 transition hover:bg-surface-2"
              >
                Unassign
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PersonPlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6.5 6.5 0 0 1 12 0M18 8v6M21 11h-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-accent" aria-hidden>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}
