"use client";

import {
  type RevenueSegment,
  formatBillions,
  formatPercent,
} from "@/lib/api";

type Props = {
  segments: RevenueSegment[];
  totalRevenue: string; // raw decimal string from the consolidated revenue LineItem
  fiscalYear: number;
};

export default function SegmentsPanel({
  segments,
  totalRevenue,
  fiscalYear,
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
    <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-baseline justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Revenue by segment
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            FY{fiscalYear}, as reported by the filer · extracted from the
            segment-reporting note
          </p>
        </div>
        <span
          className={`text-xs font-medium ${
            reconciles
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {reconciles
            ? `Reconciles to revenue (${formatBillions(segmentSum)})`
            : `Sum ${formatBillions(segmentSum)} ≠ revenue ${formatBillions(totalRev)}`}
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
              className="flex items-center gap-3 text-sm"
              title={
                s.revenue.source_quote
                  ? `“${s.revenue.source_quote}” — conf ${s.revenue.confidence.toFixed(2)}`
                  : `source: ${s.revenue.source} · conf ${s.revenue.confidence.toFixed(2)}`
              }
            >
              <span className="w-44 shrink-0 truncate text-zinc-900 dark:text-zinc-100">
                {s.name}
              </span>
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-zinc-700 dark:bg-zinc-300"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatBillions(value)}
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
                {formatPercent(sharePct, 1)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
