import { JamdaniBand } from '@/components/shared/Jamdani';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export function ListHeader({
  counts,
}: {
  counts: { needs: number; ai: number; you: number };
}) {
  return (
    <header className="px-4 pb-3 pt-5 sm:px-5 sm:pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-bold leading-[0.95] tracking-display sm:text-[32px]">
            Rongdhonu
            <br />
            Boutique<span className="text-accent">.</span>
          </h1>
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink-3 sm:text-[12.5px]">
            Today's inbox
          </div>
        </div>
        <div className="flex items-end gap-3 text-right">
          <Counter n={counts.needs} label="need you" tone="amber" />
          <Counter n={counts.ai} label="AI" tone="accent" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5 sm:mt-4">
        <ThemeToggle />
        <JamdaniBand className="h-2.5 flex-1 text-accent" />
      </div>
    </header>
  );
}

function Counter({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: 'amber' | 'accent';
}) {
  return (
    <div className="flex flex-col items-end leading-none">
      <div
        className={
          'font-display text-[26px] font-bold tabular-nums tracking-display sm:text-[32px] ' +
          (tone === 'amber' ? 'text-amber' : 'text-accent')
        }
      >
        {n}
      </div>
      <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-3 sm:text-[10.5px]">
        {label}
      </div>
    </div>
  );
}
