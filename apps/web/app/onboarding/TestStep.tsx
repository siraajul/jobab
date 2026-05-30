'use client';

export function TestStep({
  text,
  setText,
  running,
  onSend,
}: {
  text: string;
  setText: (v: string) => void;
  running: boolean;
  onSend: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-ink-2">
        We&apos;ll send a fake customer DM. The AI will reply in the inbox within a few seconds.
      </p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-[11px] border border-border-2 bg-surface-2 px-3 py-2.5 text-[15px] outline-none focus:border-accent"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={running || !text.trim()}
          className="rounded-xl bg-accent px-4 py-2.5 font-display text-[15px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {running ? 'Sending…' : 'Send test DM'}
        </button>
      </div>
    </div>
  );
}
