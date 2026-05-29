import { cn } from '@/lib/cn';

const PALETTE = ['#C8794F', '#5E8A6B', '#9B6A8C', '#4E7A93', '#B0743C', '#7B6FA8', '#A85C5C'];

function color(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  size = 44,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color(name),
        fontSize: Math.round(size * 0.36),
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
