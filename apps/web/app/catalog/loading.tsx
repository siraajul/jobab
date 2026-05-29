import { JamdaniMark } from '@/components/shared/Jamdani';

export default function Loading() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <JamdaniMark size={20} />
        </span>
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent" />
          <span className="h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent" style={{ animationDelay: '0.15s' }} />
          <span className="h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent" style={{ animationDelay: '0.3s' }} />
        </span>
      </div>
    </div>
  );
}
