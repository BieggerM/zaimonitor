import { formatUtc } from "@/lib/overview-format";

type OverviewHeaderProps = {
  latestDocumentTimestamp: string | null;
};

export function OverviewHeader({ latestDocumentTimestamp }: OverviewHeaderProps) {
  return (
    <header className="paper-panel paper-noise fade-up rounded-3xl p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-[0.22em] text-[color:var(--muted-foreground)] uppercase">
            ZAI Monitor
          </p>
          <h1 className="font-display text-4xl leading-[1.05] text-[color:var(--card-foreground)] md:text-5xl">
            Coding Plan performance
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--muted-foreground)] md:text-[15px]">
            Directional benchmarking of Z.AI inference behavior across models and rolling time windows.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 self-start md:items-end md:self-auto">
          <div className="hidden rounded-full border border-[color:var(--border)] bg-[color:var(--paper)]/55 px-2.5 py-1 sm:block">
            <p className="font-mono text-[11px] text-[color:var(--muted-foreground)]">
              latest: {formatUtc(latestDocumentTimestamp)} UTC
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
