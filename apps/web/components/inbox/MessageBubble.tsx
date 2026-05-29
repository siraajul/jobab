import { cn } from '@/lib/cn';
import type { MessageAttachments, MessageSender } from '@/lib/types';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { CandidateMatchCards } from '@/components/inbox/CandidateMatchCards';

export function MessageBubble({
  sender,
  children,
  time,
  attachments,
  onPickCandidate,
}: {
  sender: MessageSender;
  children: React.ReactNode;
  time?: string;
  attachments?: MessageAttachments | null;
  /** Called when the merchant clicks a candidate-match card to assert that
   *  product. Wired by Thread → InboxClient → api.assertProduct. */
  onPickCandidate?: (productId: string) => void;
}) {
  const isCustomer = sender === 'customer';
  const isAI = sender === 'agent';
  const isYou = sender === 'human';

  const images = attachments?.images ?? [];
  const candidates = attachments?.candidates ?? [];

  return (
    <div
      className={cn(
        'flex max-w-[80%] gap-2 animate-jb-rise',
        isCustomer ? 'self-start' : 'self-end ml-auto',
      )}
    >
      <div className="w-full">
        <div
          className={cn(
            'rounded-[18px] px-3.5 py-2.5 text-[15px] leading-snug shadow-sm break-words',
            isCustomer && 'bg-surface text-ink border border-border rounded-bl-md',
            isAI && 'bg-accent-soft text-ink border border-accent-line rounded-br-md',
            isYou && 'bg-you text-white rounded-br-md',
          )}
        >
          {isAI && (
            <div className="mb-1 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-ink">
              <JamdaniMark size={11} /> AI agent
            </div>
          )}
          {isYou && (
            <div className="mb-1 inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-white/85">
              You
            </div>
          )}
          {/* image attachments — render before the text */}
          {images.length > 0 && (
            <div className={cn('mb-2 grid gap-1.5', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {images.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Customer image"
                    className="block h-32 w-full object-cover transition hover:brightness-105"
                  />
                </a>
              ))}
            </div>
          )}
          <div>{children}</div>
          {time && (
            <span className={cn('mt-1 block text-[11px]', isYou ? 'text-white/70' : 'text-ink-3')}>
              {time}
            </span>
          )}
        </div>

        {/* candidate match cards — appear under the AI bubble */}
        {candidates.length > 0 && (
          <CandidateMatchCards
            candidates={candidates}
            confident={!!attachments?.matchConfident}
            onPick={onPickCandidate}
          />
        )}
      </div>
    </div>
  );
}
