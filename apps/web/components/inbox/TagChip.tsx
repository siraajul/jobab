import type { ConversationTag } from '@/lib/types';

/** Fixed tag palette — kept in sync with the backend `TagColor` enum. Rendered
 *  via inline styles (not Tailwind classes) so the colours survive purge and we
 *  can tint background/border/text from one hex. */
export const TAG_COLORS: Record<string, string> = {
  slate: '#64748b',
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  teal: '#14b8a6',
};

export const TAG_COLOR_NAMES = Object.keys(TAG_COLORS);

export function tagColorHex(color: string | undefined): string {
  return (color && TAG_COLORS[color]) || TAG_COLORS.slate;
}

export function TagChip({
  tag,
  onRemove,
}: {
  tag: ConversationTag;
  /** When provided, renders a remove (×) affordance. */
  onRemove?: () => void;
}) {
  const hex = tagColorHex(tag.color);
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none"
      style={{ backgroundColor: `${hex}1f`, borderColor: `${hex}55`, color: hex }}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${tag.name}`}
          className="-mr-0.5 shrink-0 rounded-full opacity-70 transition hover:opacity-100"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      )}
    </span>
  );
}
