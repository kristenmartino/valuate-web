"use client";

import SourceDetails from "./SourceDetails";

import {
  type RevenueSegment,
  formatMoney,
  formatPercent,
} from "@/lib/api";

type Props = {
  segments: RevenueSegment[];
  totalRevenue: string; // raw decimal string from the consolidated revenue LineItem
  fiscalYear: number;
  coverageNote?: string;
};

export default function SegmentsPanel({
  segments,
  totalRevenue,
  fiscalYear,
  coverageNote,
}: Props) {
  if (segments.length === 0) return null;
  const totalRev = Number(totalRevenue);
  const max = segments.reduce(
    (m, s) => Math.max(m, Number(s.revenue.value)),
    0,
  );
  const segmentSum = segments.reduce(
    (sum, s) => sum + Number(s.revenue.value),
    0,
  );
  // Reconciliation flag: if segments don't sum to within 0.5% of consolidated
  // revenue, surface it (different segment definition, missing "other", etc.)
  const reconciles =
    totalRev > 0 && Math.abs(segmentSum - totalRev) / totalRev < 0.005;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Revenue breakdown
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            FY{fiscalYear} · revenue categories from filing disclosures
          </p>
          {coverageNote && <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{coverageNote}</p>}
        </div>
        <span
          className={`text-xs font-medium ${
            reconciles
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {reconciles
            ? `Reconciles to revenue (${formatMoney(segmentSum)})`
            : `Sum ${formatMoney(segmentSum)} ≠ revenue ${formatMoney(totalRev)}`}
        </span>
      </header>

      <ul className="mt-4 space-y-2">
        {segments.map((s) => {
          const value = Number(s.revenue.value);
          const widthPct = max > 0 ? (value / max) * 100 : 0;
          const sharePct = totalRev > 0 ? value / totalRev : 0;
          return (
            <li
              key={s.name}
              className="flex flex-wrap items-center gap-3 text-sm"

            >
              <span className="w-full shrink-0 text-zinc-900 sm:w-56 dark:text-zinc-100">
                {s.name}
              </span>
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-zinc-700 dark:bg-zinc-300"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatMoney(value)}
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
                {formatPercent(sharePct, 1)}
              </span>
              <div className="w-full"><SourceDetails item={s.revenue} label={s.name} /></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
