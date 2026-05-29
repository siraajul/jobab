import { useMemo } from 'react';
import type { ConversationDetail } from '@/lib/types';

/** Unique image URLs shared in a conversation (customer photos + AI match
 *  thumbnails). Exported so the Section header can show a count. */
export function sharedImages(conversation: ConversationDetail): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of conversation.messages) {
    const a = m.attachments;
    if (!a) continue;
    for (const url of a.images ?? []) {
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
    for (const c of a.candidates ?? []) {
      const url = c.image_url;
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
  }
  return out;
}

/** Every image shared in the conversation — customer photos plus any
 *  candidate-match thumbnails the AI surfaced — collected into one gallery.
 *  Pure client-side: derived from the thread that's already loaded. Rendered
 *  inside a right-rail Section, which supplies the heading. */
export function SharedFiles({ conversation }: { conversation: ConversationDetail }) {
  const images = useMemo(() => sharedImages(conversation), [conversation]);

  if (images.length === 0) {
    return (
      <p className="px-5 pb-2 text-[13px] text-ink-3">
        Photos the customer sends — and product matches the AI proposes — collect here.
      </p>
    );
  }

  return (
    <div className="px-5 pb-1">
      <div className="grid grid-cols-3 gap-2">
        {images.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Shared file ${i + 1}`}
              className="h-full w-full object-cover transition hover:brightness-105"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
