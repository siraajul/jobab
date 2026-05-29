import { NavRail } from './NavRail';
import { AvatarMenu } from './AvatarMenu';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { JamdaniBand } from '@/components/shared/Jamdani';

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid h-[100dvh] grid-cols-1 xl:grid-cols-[84px_1fr]">
      <div className="hidden xl:block">
        <NavRail />
      </div>
      <div className="flex min-h-0 flex-col">
        <header className="border-b border-border bg-bg px-4 pt-5 sm:px-8 sm:pt-6">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[26px] font-bold leading-[0.95] tracking-display sm:text-[32px]">
                {title}
                <span className="text-accent">.</span>
              </h1>
              {subtitle && (
                <div className="mt-1.5 truncate text-[11.5px] uppercase tracking-[0.18em] text-ink-3 sm:text-[12.5px]">
                  {subtitle}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <ThemeToggle />
              <AvatarMenu />
            </div>
          </div>
          <JamdaniBand className="mt-4 h-2 text-accent sm:mt-5" />
        </header>
        <main className="flex-1 overflow-y-auto px-4 pb-8 pt-5 sm:px-8 sm:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
