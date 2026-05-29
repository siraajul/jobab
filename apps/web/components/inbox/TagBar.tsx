'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { ConversationTag, Tag } from '@/lib/types';
import { TagChip, TAG_COLOR_NAMES, tagColorHex } from '@/components/inbox/TagChip';

/** The tag strip under the thread header: current tags as removable chips plus
 *  an "Add tag" popover to apply existing palette tags or create a new one. */
export function TagBar({
  tags,
  palette,
  onAdd,
  onRemove,
  onCreate,
  className = 'flex flex-wrap items-center gap-1.5 border-b border-border bg-surface px-3 py-2 sm:px-6',
}: {
  tags: ConversationTag[];
  palette: Tag[];
  onAdd: (tag: ConversationTag) => void;
  onRemove: (tagId: string) => void;
  onCreate: (name: string, color: string) => void;
  /** Override the wrapper styling — the right-rail panel renders it bare. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [color, setColor] = useState('blue');

  const applied = new Set(tags.map((t) => t.id));
  const q = query.trim().toLowerCase();
  const candidates = palette.filter(
    (t) => !applied.has(t.id) && t.name.toLowerCase().includes(q),
  );
  const exactExists = palette.some((t) => t.name.toLowerCase() === q);
  const canCreate = q.length > 0 && !exactExists;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={className}>
      {tags.map((t) => (
        <TagChip key={t.id} tag={t} onRemove={() => onRemove(t.id)} />
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2 transition hover:bg-surface-2"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tag
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={close} aria-hidden />
            <div
              role="dialog"
              className="absolute left-0 z-40 mt-1.5 w-64 rounded-xl border border-border bg-surface p-2 shadow-lg"
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find or create a tag…"
                className="mb-1.5 w-full rounded-lg border border-border-2 bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent"
              />

              <div className="max-h-48 overflow-y-auto">
                {candidates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onAdd({ id: t.id, name: t.name, color: t.color });
                      close();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition hover:bg-surface-2"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tagColorHex(t.color) }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
                {candidates.length === 0 && !canCreate && (
                  <div className="px-2 py-2 text-[12.5px] text-ink-3">
                    {palette.length === 0 ? 'No tags yet — type to create one.' : 'No matches.'}
                  </div>
                )}
              </div>

              {canCreate && (
                <div className="mt-1.5 border-t border-border pt-1.5">
                  <div className="mb-1.5 flex items-center gap-1.5 px-1">
                    {TAG_COLOR_NAMES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`Colour ${c}`}
                        className={cn(
                          'h-4 w-4 rounded-full transition',
                          color === c ? 'ring-2 ring-offset-1 ring-offset-surface' : 'opacity-70',
                        )}
                        style={{
                          backgroundColor: tagColorHex(c),
                          // ring colour matches the swatch
                          ...(color === c ? { boxShadow: `0 0 0 2px ${tagColorHex(c)}` } : {}),
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onCreate(query.trim(), color);
                      close();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold transition hover:bg-surface-2"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tagColorHex(color) }}
                    />
                    Create “{query.trim()}”
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
