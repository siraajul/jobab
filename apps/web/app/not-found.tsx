import Link from 'next/link';
import { JamdaniMark } from '@/components/shared/Jamdani';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <JamdaniMark size={26} />
        </div>
        <div className="font-display text-[28px] font-bold tracking-display">
          Page not found<span className="text-accent">.</span>
        </div>
        <p className="max-w-sm text-[13.5px] text-ink-2">
          The page you&apos;re looking for isn&apos;t here. Maybe it moved, or maybe it never
          existed.
        </p>
        <Link
          href="/inbox"
          className="mt-2 rounded-xl bg-accent px-4 py-2.5 font-display text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          Back to inbox
        </Link>
      </div>
    </div>
  );
}
