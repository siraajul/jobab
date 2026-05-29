import { Avatar } from '@/components/shared/Avatar';
import { ChannelBadge, channelLabel } from '@/components/inbox/ChannelBadge';
import { StatusPill } from '@/components/inbox/StatusPill';
import { handoffLabel, isProblemCategory } from '@/lib/handoff';
import { cn } from '@/lib/cn';
import type { ConversationDetail } from '@/lib/types';

/** The header of the right rail — who the merchant is talking to, on which
 *  channel, the AI/human status, and the captured delivery details. */
export function ContactCard({ conversation }: { conversation: ConversationDetail }) {
  const name = conversation.customerName ?? conversation.externalUserId;
  const created = conversation.createdAt ? new Date(conversation.createdAt) : null;
  const rows: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Phone', value: conversation.customerPhone },
    { label: 'Address', value: conversation.customerAddress },
  ];

  return (
    <div className="border-b border-border px-5 py-5">
      <div className="flex items-center gap-3">
        <Avatar name={name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[18px] font-semibold leading-tight tracking-display">
            {name}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.12em] text-ink-3">
            <ChannelBadge platform={conversation.page?.platform} size={14} />
            {channelLabel(conversation.page?.platform)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill status={conversation.status} pulse={conversation.status === 'bot'} />
        {isProblemCategory(conversation.handoffCategory) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-bg px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-red">
            {handoffLabel(conversation.handoffCategory)}
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 text-[13px]">
            <dt className="w-16 shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-3">
              {r.label}
            </dt>
            <dd
              className={cn(
                'min-w-0 flex-1 break-words',
                r.value?.trim() ? 'text-ink' : 'italic text-ink-3',
              )}
            >
              {r.value?.trim() || `No ${r.label.toLowerCase()} yet`}
            </dd>
          </div>
        ))}
        {created && (
          <div className="flex items-start gap-3 text-[13px]">
            <dt className="w-16 shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-3">
              Since
            </dt>
            <dd className="min-w-0 flex-1 text-ink-2">
              {created.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
