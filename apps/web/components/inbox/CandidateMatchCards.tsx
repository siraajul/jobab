import { cn } from '@/lib/cn';
import { JamdaniMark } from '@/components/shared/Jamdani';

interface Candidate {
  product_id: string;
  title: string;
  score: number;
  image_url?: string | null;
}

export function CandidateMatchCards({
  candidates,
  confident,
  onPick,
}: {
  candidates: Candidate[];
  confident: boolean;
  onPick?: (productId: string) => void;
}) {
  if (candidates.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl border border-border-2 bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <JamdaniMark size={11} className="text-accent" />
        <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-accent-ink">
          {confident ? 'Matched' : 'Possible matches'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {candidates.map((c, i) => (
          <button
            type="button"
            key={c.product_id}
            onClick={() => onPick?.(c.product_id)}
            className={cn(
              'group relative overflow-hidden rounded-xl border bg-surface-2 text-left transition hover:-translate-y-0.5 hover:shadow-md',
              confident && i === 0 ? 'border-accent ring-2 ring-accent-soft' : 'border-border-2',
            )}
          >
            <div
              className="aspect-square w-full"
              style={
                c.image_url
                  ? { backgroundImage: `url(${c.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'repeating-linear-gradient(45deg, var(--surface-2) 0 9px, var(--surface-3) 9px 18px)' }
              }
            />
            <div className="px-2.5 py-2">
              <div className="truncate text-[12.5px] font-semibold">{c.title}</div>
              <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">
                {Math.round(c.score * 100)}% match
              </div>
            </div>
            {confident && i === 0 && (
              <div className="absolute right-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
