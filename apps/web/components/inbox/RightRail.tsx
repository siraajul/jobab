import type { ConversationDetail, ConversationTag, Order, Tag } from '@/lib/types';
import { OrderPanel } from '@/components/inbox/OrderPanel';
import { SharedFiles, sharedImages } from '@/components/inbox/SharedFiles';
import { ActivityList } from '@/components/inbox/ActivityList';
import { ContactCard } from '@/components/inbox/ContactCard';
import { Section } from '@/components/inbox/Section';
import { TagBar } from '@/components/inbox/TagBar';
import { NotesPanel } from '@/components/inbox/NotesPanel';

/** The right rail — a scrollable, stacked CRM panel: who the customer is, the
 *  live order receipt, editable tags, internal notes, AI activity, and shared
 *  files. Replaces the old tabbed layout so the panel always shows useful
 *  context instead of one big empty state. */
export function RightRail({
  conversation,
  order,
  palette,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: {
  conversation: ConversationDetail;
  order: Order | null;
  palette: Tag[];
  onAddTag: (tag: ConversationTag) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => void;
}) {
  const tags = conversation.tags ?? [];
  const fileCount = sharedImages(conversation).length;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-bg">
      <ContactCard conversation={conversation} />

      <Section title="Order" padded={false} defaultOpen>
        {order ? (
          <OrderPanel conversation={conversation} order={order} />
        ) : (
          <p className="px-5 pb-2 text-[13px] leading-relaxed text-ink-3">
            No active order yet — the receipt assembles here as the AI takes the order.
          </p>
        )}
      </Section>

      <Section title="Tags" count={tags.length} defaultOpen>
        <TagBar
          tags={tags}
          palette={palette}
          onAdd={onAddTag}
          onRemove={onRemoveTag}
          onCreate={onCreateTag}
          className="flex flex-wrap items-center gap-1.5"
        />
      </Section>

      <Section title="Notes" padded={false} defaultOpen={false}>
        <NotesPanel conversationId={conversation.id} />
      </Section>

      <Section title="Activity" padded={false} defaultOpen={false}>
        <ActivityList conversationId={conversation.id} />
      </Section>

      <Section title="Shared files" count={fileCount} padded={false} defaultOpen={false}>
        <SharedFiles conversation={conversation} />
      </Section>
    </div>
  );
}
