import { cn } from '@/lib/cn';

/** The three channels Jobab can ingest. Anything unrecognised falls back to a
 *  neutral chip so the UI never breaks on an unexpected platform string. */
export type Channel = 'facebook' | 'instagram' | 'whatsapp';

const CHANNELS: Record<Channel, { label: string; dot: string; ring: string }> = {
  facebook: { label: 'Facebook', dot: 'bg-[#1877F2]', ring: 'ring-[#1877F2]/30' },
  instagram: { label: 'Instagram', dot: 'bg-[#E1306C]', ring: 'ring-[#E1306C]/30' },
  whatsapp: { label: 'WhatsApp', dot: 'bg-[#25D366]', ring: 'ring-[#25D366]/30' },
};

export function channelOf(platform: string | undefined | null): Channel | null {
  if (platform === 'facebook' || platform === 'instagram' || platform === 'whatsapp') {
    return platform;
  }
  return null;
}

export function channelLabel(platform: string | undefined | null): string {
  const c = channelOf(platform);
  return c ? CHANNELS[c].label : 'Direct message';
}

/** Tiny channel icon — a coloured glyph badge. Used on conversation rows and
 *  in the thread header so the merchant always knows where a DM came from. */
export function ChannelBadge({
  platform,
  size = 16,
  className,
}: {
  platform: string | undefined | null;
  size?: number;
  className?: string;
}) {
  const c = channelOf(platform);
  if (!c) return null;
  return (
    <span
      title={CHANNELS[c].label}
      aria-label={CHANNELS[c].label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full text-white',
        CHANNELS[c].dot,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <ChannelGlyph channel={c} size={Math.round(size * 0.62)} />
    </span>
  );
}

function ChannelGlyph({ channel, size }: { channel: Channel; size: number }) {
  if (channel === 'facebook') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13.5 21v-7h2.3l.4-2.9h-2.7V9.3c0-.84.26-1.4 1.46-1.4H16V5.3A20 20 0 0 0 13.7 5c-2.3 0-3.9 1.4-3.9 4v2.1H7.5V14h2.3v7h3.7z" />
      </svg>
    );
  }
  if (channel === 'instagram') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.8.7-2.7-.2-.3A8 8 0 0 1 12 4zm-2.5 4c-.2 0-.5.1-.7.4-.2.3-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.6 4 3.5 2 .8 2.4.6 2.8.6.4 0 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.6-.3l-1.2-.6c-.2-.1-.4-.1-.5.1l-.6.8c-.1.2-.3.2-.5.1-.7-.3-1.4-.6-2.1-1.6-.2-.3.2-.3.5-.9.1-.1 0-.3 0-.4l-.6-1.4c-.1-.4-.3-.3-.5-.3h-.4z" />
    </svg>
  );
}
