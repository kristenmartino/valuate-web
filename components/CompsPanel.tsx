"use client";

import {
  type CompsResponse,
  type PeerMultiples,
  formatMoney,
} from "@/lib/api";

type Props = {
  comps: CompsResponse;
  // For the DCF-implied row, computed by the parent so we don't have to
  // re-derive consolidated revenue and net income here.
  dcfImplied: {
    market_cap: number;
    enterprise_value: number;
    pe_ratio: number | null;
    ev_revenue: number | null;
    ev_ebitda: number | null;
  } | null;
};

const NA = "—";

function numFmt(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return NA;
  return x.toFixed(digits);
}

function bnFmt(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return NA;
  return formatMoney(x);
}

function Cell({
  children,
  bold = false,
  muted = false,
  highlight = false,
}: {
  children: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-3 py-1.5 text-right tabular-nums ${
        bold ? "font-medium" : ""
      } ${muted ? "text-zinc-500 dark:text-zinc-500" : ""} ${
        highlight ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
      }`}
    >
      {children}
    </td>
  );
}

export default function CompsPanel({ comps, dcfImplied }: Props) {
  if (!comps.peers.length && !comps.target_market) return null;

  const allRows: Array<{
    label: string;
    ticker: string;
    data: PeerMultiples | null;
    isTarget: boolean;
    isImplied: boolean;
    isMedian: boolean;
  }> = [];

  if (comps.target_market) {
    allRows.push({
      label: comps.target_market.name,
      ticker: comps.target_market.ticker,
      data: comps.target_market,
      isTarget: true,
      isImplied: false,
      isMedian: false,
    });
  }
  for (const p of comps.peers) {
    allRows.push({
      label: p.name,
      ticker: p.ticker,
      data: p,
      isTarget: false,
      isImplied: false,
      isMedian: false,
    });
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Trading comps
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Current peer multiples from public market data, alongside the
          multiple your DCF assumptions imply. Useful as a relative-value
          sanity check on the intrinsic-value estimate.
        </p>
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 text-right font-medium">Mkt Cap</th>
              <th className="px-3 py-2 text-right font-medium">EV</th>
              <th className="px-3 py-2 text-right font-medium">P/E</th>
              <th className="px-3 py-2 text-right font-medium">EV / Rev</th>
              <th className="px-3 py-2 text-right font-medium">EV / EBITDA</th>
            </tr>
          </thead>
          <tbody className="text-zinc-900 dark:text-zinc-100">
            {allRows.map((row) => (
              <tr
                key={`${row.ticker}-${row.isTarget}`}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-3 py-1.5 font-mono text-xs">
                  {row.ticker}
                  {row.isTarget && (
                    <span className="ml-1.5 rounded-sm bg-zinc-100 px-1 text-[10px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      target
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
                  {row.label}
                </td>
                <Cell bold={row.isTarget}>{bnFmt(row.data?.market_cap)}</Cell>
                <Cell bold={row.isTarget}>
                  {bnFmt(row.data?.enterprise_value)}
                </Cell>
                <Cell bold={row.isTarget}>{numFmt(row.data?.pe_ratio)}x</Cell>
                <Cell bold={row.isTarget}>{numFmt(row.data?.ev_revenue)}x</Cell>
                <Cell bold={row.isTarget}>{numFmt(row.data?.ev_ebitda)}x</Cell>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-300 dark:border-zinc-700">
              <td
                colSpan={2}
                className="px-3 py-1.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500"
              >
                Peer median
              </td>
              <Cell muted>—</Cell>
              <Cell muted>—</Cell>
              <Cell muted>{numFmt(comps.median_pe)}x</Cell>
              <Cell muted>{numFmt(comps.median_ev_revenue)}x</Cell>
              <Cell muted>{numFmt(comps.median_ev_ebitda)}x</Cell>
            </tr>
            {dcfImplied && (
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <td
                  colSpan={2}
                  className="px-3 py-1.5 text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
                  title="What the DCF-implied equity value translates to as multiples"
                >
                  DCF implies
                </td>
                <Cell highlight>{bnFmt(dcfImplied.market_cap)}</Cell>
                <Cell highlight>{bnFmt(dcfImplied.enterprise_value)}</Cell>
                <Cell highlight>{numFmt(dcfImplied.pe_ratio)}x</Cell>
                <Cell highlight>{numFmt(dcfImplied.ev_revenue)}x</Cell>
                <Cell highlight>{numFmt(dcfImplied.ev_ebitda)}x</Cell>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        Peer market data via Yahoo Finance (refreshed on each load). Numbers
        are LTM where available.
      </p>
    </section>
  );
}
