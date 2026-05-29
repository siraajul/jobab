/**
 * Jamdani-inspired SVG ornaments — a quiet visual signature borrowed from
 * the geometric motifs in Bengali jamdani weaving. Kept tiny and monochrome
 * so they read as texture, not illustration.
 */
import { cn } from '@/lib/cn';

/** Small stamped motif — used at panel corners, in the AI marker, etc. */
export function JamdaniMark({
  size = 14,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 1.5l3 5.5 5.5 1.5-4 4 1 6L12 16l-5.5 2.5 1-6-4-4L9 7z" opacity=".18" />
      <path d="M12 5l1.6 3 3.4.5-2.5 2.4.6 3.4L12 12.6l-3.1 1.7.6-3.4-2.5-2.4 3.4-.5z" />
      <circle cx="12" cy="9.8" r="0.9" fill="var(--bg)" />
    </svg>
  );
}

/** Vertical strip of diamond-and-dot lattice — for the nav rail. */
export function JamdaniStrip({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 200"
      preserveAspectRatio="xMidYMid"
      className={cn('opacity-25', className)}
      aria-hidden
    >
      <defs>
        <pattern id="jb-jamdani" width="18" height="22" patternUnits="userSpaceOnUse">
          <path
            d="M9 2 L14 11 L9 20 L4 11 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <circle cx="9" cy="11" r="0.9" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="18" height="200" fill="url(#jb-jamdani)" />
    </svg>
  );
}

/** Horizontal lattice band — corner ornaments, panel headers. */
export function JamdaniBand({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 12"
      preserveAspectRatio="xMidYMid"
      className={cn('opacity-50', className)}
      aria-hidden
    >
      <defs>
        <pattern id="jb-band" width="20" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M10 1 L18 6 L10 11 L2 6 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
          />
          <circle cx="10" cy="6" r="0.7" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="120" height="12" fill="url(#jb-band)" />
    </svg>
  );
}

/** Top/bottom perforated edge used for the receipt-style order panel. */
export function PerforatedEdge({
  direction,
  fill = 'var(--bg)',
}: {
  direction: 'top' | 'bottom';
  fill?: string;
}) {
  // A row of half-circles cut into the receipt; sits flush against the panel.
  return (
    <svg
      viewBox="0 0 200 10"
      preserveAspectRatio="none"
      className={cn(
        'block h-2.5 w-full',
        direction === 'top' ? 'rotate-180' : '',
      )}
      aria-hidden
    >
      <path
        d="M0,0 L200,0 L200,10 C190,10 190,0 180,0 C170,0 170,10 160,10 C150,10 150,0 140,0 C130,0 130,10 120,10 C110,10 110,0 100,0 C90,0 90,10 80,10 C70,10 70,0 60,0 C50,0 50,10 40,10 C30,10 30,0 20,0 C10,0 10,10 0,10 Z"
        fill={fill}
      />
    </svg>
  );
}
