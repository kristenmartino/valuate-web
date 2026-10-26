"use client";

import {
  type CompsResponse,
  type PeerMultiples,
  formatMoney,
} from "@/lib/api";
import { formatMultiple, positivePeerCounts } from "@/lib/compsDisplay";

type Props = {
  comps: CompsResponse;
  impliedEbitdaNote?: string;
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

function bnFmt(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
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

export default function CompsPanel({ comps, dcfImplied, impliedEbitdaNote }: Props) {
  if (!comps.peers.length && !comps.target_market) return null;
  const counts = positivePeerCounts(comps.peers);

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
          {dcfImplied
            ? "Market multiples from Yahoo Finance, with a DCF-implied row calculated from the selected assumptions."
            : "Market multiples from Yahoo Finance for context. This table does not show multiples implied by the selected valuation model."}{" "}
          Reporting periods and valuation dates may differ.
        </p>
        {impliedEbitdaNote && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{impliedEbitdaNote}</p>}
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
                <Cell bold={row.isTarget}>{formatMultiple(row.data?.pe_ratio)}</Cell>
                <Cell bold={row.isTarget}>{formatMultiple(row.data?.ev_revenue)}</Cell>
                <Cell bold={row.isTarget}>{formatMultiple(row.data?.ev_ebitda)}</Cell>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-300 dark:border-zinc-700">
              <td
                colSpan={2}
                className="px-3 py-1.5 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500"
              >
                Peer median (positive values)
              </td>
              <Cell muted>—</Cell>
              <Cell muted>—</Cell>
              <Cell muted>
                {formatMultiple(comps.median_pe)}
                <span className="block whitespace-nowrap text-xs">{counts.pe_ratio} of {comps.peers.length} peers</span>
              </Cell>
              <Cell muted>
                {formatMultiple(comps.median_ev_revenue)}
                <span className="block whitespace-nowrap text-xs">{counts.ev_revenue} of {comps.peers.length} peers</span>
              </Cell>
              <Cell muted>
                {formatMultiple(comps.median_ev_ebitda)}
                <span className="block whitespace-nowrap text-xs">{counts.ev_ebitda} of {comps.peers.length} peers</span>
              </Cell>
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
                <Cell highlight>{formatMultiple(dcfImplied.pe_ratio)}</Cell>
                <Cell highlight>{formatMultiple(dcfImplied.ev_revenue)}</Cell>
                <Cell highlight>{formatMultiple(dcfImplied.ev_ebitda)}</Cell>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        Each median includes only returned peers with a positive, finite value in
        that column. Missing, zero and negative values are excluded; the target
        and DCF-implied rows are excluded. Counts can differ by column.
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        Market data is requested from Yahoo Finance when the workspace loads.
        This panel does not expose provider as-of timestamps; a new request does
        not establish that every quote or financial input is current.
      </p>
    </section>
  );
}
