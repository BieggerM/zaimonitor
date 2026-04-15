"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Github } from "lucide-react";
import { OverviewHeader } from "@/components/overview-header";
import { OverviewKpisPrimary, OverviewKpisSecondary } from "@/components/overview-kpis";
import { OverviewTrend } from "@/components/overview-trend";
import { useOverviewData } from "@/hooks/use-overview-data";

const GITHUB_REPO_URL = "https://github.com/BieggerM/zaimonitor";

export default function Home() {
  const [hours, setHours] = useState("24");
  const { data, error } = useOverviewData(hours);

  const latestDocumentTimestamp = data?.latest_document_timestamp ?? null;
  const trendWindowStart = data?.window.start ?? null;
  const trendWindowEnd = data?.window.end ?? null;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-7 md:px-10 md:py-10">
      <div className="pointer-events-none select-none opacity-40 blur-[1px] saturate-50 grayscale-[45%]">
        <OverviewHeader
          latestDocumentTimestamp={latestDocumentTimestamp}
        />

        {error ? (
          <section className="paper-panel rounded-2xl border border-red-300 p-5 text-sm text-red-700">{error}</section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="font-display text-sm tracking-[0.16em] uppercase text-[color:var(--muted-foreground)]">
              Current Snapshot
            </h2>
            <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--paper)]/60 px-2.5 py-1 font-mono text-[10px] text-[color:var(--card-foreground)]">
              Latest values
            </span>
          </div>

          <OverviewKpisPrimary
            trendByModel={data?.trend_by_model ?? {}}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="font-display text-sm tracking-[0.16em] uppercase text-[color:var(--muted-foreground)]">
              Historical Window
            </h2>
            <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--paper)]/60 px-2.5 py-1 font-mono text-[10px] text-[color:var(--card-foreground)]">
              Last {hours}h
            </span>
          </div>

          <OverviewTrend
            trendByModel={data?.trend_by_model ?? {}}
            failureByModel={data?.failure_by_model ?? {}}
            windowStart={trendWindowStart}
            windowEnd={trendWindowEnd}
            hours={hours}
            onHoursChange={setHours}
          />

          <OverviewKpisSecondary
            data={data?.metrics_by_model ?? {}}
          />
        </section>

        <div className="fade-up fade-up-delay-3">
          <Link
            href="/methodology"
            className="quiet-link inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm leading-none font-semibold text-[color:var(--muted-foreground)] transition sm:h-8"
          >
            Methodology
          </Link>
        </div>

        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
          className="fixed right-4 bottom-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--paper)]/70 text-[color:var(--muted-foreground)] opacity-85 shadow-[0_10px_20px_-14px_rgba(15,18,20,0.85)] transition hover:opacity-100"
        >
          <Github className="h-5 w-5" strokeWidth={1.8} />
        </a>
      </div>

      <section className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--ink)]/72 px-4 py-6 backdrop-blur-[4px]">
        <article
          role="alert"
          className="paper-panel paper-noise w-full max-w-3xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--card-foreground)] shadow-[0_30px_85px_-30px_rgba(10,12,14,0.9)]"
        >
          <div className="rounded-t-2xl bg-[color:var(--secondary)] px-5 py-2 text-[11px] font-semibold tracking-[0.14em] text-[color:var(--secondary-foreground)] uppercase">
            Discontinued website
          </div>
          <div className="flex items-start gap-3 px-5 py-5 md:gap-4 md:px-6 md:py-6">
            <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
              <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="space-y-3">
              <p className="font-display text-2xl leading-tight text-[color:var(--card-foreground)] md:text-3xl">
                This dashboard is no longer available
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--muted-foreground)] md:text-[15px]">
                Z.AI policy has changed and no longer permits script calls to the Coding API, so this site cannot continue operating.
              </p>
              <p className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--paper)]/65 px-3 py-1 font-mono text-xs tracking-[0.08em] text-[color:var(--muted-foreground)]">
                (;_;)/~~~ goodbye from the monitor
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
