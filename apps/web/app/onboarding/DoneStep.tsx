'use client';

export function DoneStep({ onOpenInbox }: { onOpenInbox: () => void }) {
  return (
    <div className="space-y-3 text-center">
      <div className="font-display text-[28px] font-bold tracking-display text-accent">
        You&apos;re live 🌸
      </div>
      <p className="text-[14px] text-ink-2">
        Jobab is now answering DMs for you. Check the inbox to see the test reply land.
      </p>
      <button
        onClick={onOpenInbox}
        className="rounded-xl bg-accent px-5 py-3 font-display text-[15px] font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Open inbox
      </button>
    </div>
  );
}
