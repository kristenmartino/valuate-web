"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type Assumptions,
  type Company,
  type CompsResponse,
  type LineItem,
  type ValuationResponse,
  formatBillions,
  formatPercent,
  formatUSD,
  getCompany,
  getComps,
  getDefaults,
  postExtract,
  postValue,
} from "@/lib/api";

import AssumptionsPanel from "./AssumptionsPanel";
import CompsPanel from "./CompsPanel";
import FlagsPanel from "./FlagsPanel";
import MonteCarloChart from "./MonteCarloChart";
import SegmentsPanel from "./SegmentsPanel";
import SensitivityHeatmap from "./SensitivityHeatmap";

type LoadStatus =
  | { phase: "idle" }
  | { phase: "extracting"; message: string }
  | { phase: "ready" }
  | { phase: "error"; message: string };

export default function Workspace({ ticker }: { ticker: string }) {
  const [status, setStatus] = useState<LoadStatus>({ phase: "idle" });
  const [company, setCompany] = useState<Company | null>(null);
  const [assumptions, setAssumptions] = useState<Assumptions | null>(null);
  const [valuation, setValuation] = useState<ValuationResponse | null>(null);
  const [comps, setComps] = useState<CompsResponse | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // Initial load: ensure /company exists, fetch defaults, run first valuation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus({ phase: "extracting", message: "Checking cache..." });
        let c = await getCompany(ticker);
        if (!c) {
          setStatus({
            phase: "extracting",
            message:
              "Fetching 10-K from SEC and extracting line items (~15s)...",
          });
          c = await postExtract(ticker);
        }
        if (cancelled) return;
        setCompany(c);

        setStatus({ phase: "extracting", message: "Loading default assumptions..." });
        const a = await getDefaults(ticker);
        if (cancelled) return;
        setAssumptions(a);

        setStatus({ phase: "extracting", message: "Computing initial valuation..." });
        const v = await postValue(ticker, {
          assumptions: a,
          monte_carlo: { iterations: 10000, seed: 42 },
          sensitivity: { revenue_growth_steps: 7, operating_margin_steps: 7 },
        });
        if (cancelled) return;
        setValuation(v);
        setStatus({ phase: "ready" });

        // Comps are independent of /extract; fetch in parallel-ish, after
        // the workspace is interactive. Failures don't block the rest.
        getComps(ticker)
          .then((c) => {
            if (!cancelled) setComps(c);
          })
          .catch((e) => console.error("comps fetch failed:", e));
      } catch (err) {
        if (cancelled) return;
        setStatus({
          phase: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  // Recompute helper used by both the debounced assumptions watcher and
  // the override flow (where the underlying line items just changed).
  async function recompute(currentAssumptions: Assumptions) {
    setRecomputing(true);
    try {
      const v = await postValue(ticker, {
        assumptions: currentAssumptions,
        monte_carlo: { iterations: 10000, seed: 42 },
        sensitivity: { revenue_growth_steps: 7, operating_margin_steps: 7 },
      });
      setValuation(v);
    } catch (err) {
      console.error(err);
    } finally {
      setRecomputing(false);
    }
  }

  // Debounced re-valuation when assumptions change post-load.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!company || !assumptions || status.phase !== "ready") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      recompute(assumptions);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assumptions]);

  // After a HITL override, swap in the updated Company and re-run /value
  // so the fair value, Monte Carlo, and sensitivity all reflect the change.
  function handleOverride(updated: Company) {
    setCompany(updated);
    if (assumptions) recompute(assumptions);
  }

  const period = company?.periods[0];
  const flagCount = company?.extraction_flags.length ?? 0;

  const summary = useMemo(() => {
    if (!period || !valuation) return null;
    const p = valuation.projection;
    const mc = valuation.monte_carlo;
    return {
      enterprise_value: p.enterprise_value,
      equity_value: p.equity_value,
      net_debt: p.net_debt,
      fair_value: p.fair_value_per_share,
      mc_p10: mc?.p10 ?? null,
      mc_p90: mc?.p90 ?? null,
      mc_median: mc?.median ?? null,
    };
  }, [period, valuation]);

  // What the DCF's equity/enterprise values translate to as multiples,
  // so the user can compare against peer medians directly.
  const dcfImplied = useMemo(() => {
    if (!period || !valuation) return null;
    const p = valuation.projection;
    const rev = Number(period.income_statement.revenue.value);
    const ni = Number(period.income_statement.net_income.value);
    const op = Number(period.income_statement.operating_income.value);
    const da = Number(
      period.cash_flow_statement.depreciation_amortization.value,
    );
    const ebitda = op + da;
    return {
      market_cap: p.equity_value,
      enterprise_value: p.enterprise_value,
      pe_ratio: ni > 0 ? p.equity_value / ni : null,
      ev_revenue: rev > 0 ? p.enterprise_value / rev : null,
      ev_ebitda: ebitda > 0 ? p.enterprise_value / ebitda : null,
    };
  }, [period, valuation]);

  if (status.phase === "extracting" || (status.phase === "idle" && !company)) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {status.phase === "extracting" ? status.message : "Loading..."}
        </p>
      </div>
    );
  }

  if (status.phase === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm font-medium text-red-900 dark:text-red-200">
          Could not load {ticker}
        </p>
        <p className="mt-2 font-mono text-xs text-red-700 dark:text-red-300">
          {status.message}
        </p>
      </div>
    );
  }

  if (!company || !assumptions || !period || !valuation || !summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {company.name}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              FY{period.fiscal_year} 10-K · period ending{" "}
              {period.fiscal_period_end} · accession{" "}
              <span className="font-mono">{period.filing_accession}</span>
            </p>
          </div>
          {flagCount > 0 && (
            <a
              href="#extraction-flags"
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
            >
              {flagCount} extraction flag{flagCount === 1 ? "" : "s"} →
            </a>
          )}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ExtractStat label="Revenue" item={period.income_statement.revenue} />
          <ExtractStat label="Operating income" item={period.income_statement.operating_income} />
          <ExtractStat label="Net income" item={period.income_statement.net_income} />
          <ExtractStat label="Total assets" item={period.balance_sheet.total_assets} />
        </dl>
      </section>

      <div id="extraction-flags" className="scroll-mt-4">
        <FlagsPanel
          ticker={ticker}
          flags={company.extraction_flags}
          company={company}
          onOverride={handleOverride}
        />
      </div>

      {period.income_statement.revenue_segments &&
        period.income_statement.revenue_segments.length > 0 && (
          <SegmentsPanel
            segments={period.income_statement.revenue_segments}
            totalRevenue={period.income_statement.revenue.value}
            fiscalYear={period.fiscal_year}
          />
        )}

      {comps && (comps.peers.length > 0 || comps.target_market) && (
        <CompsPanel comps={comps} dcfImplied={dcfImplied} />
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Fair value per share
          </h3>
          {recomputing && (
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              recomputing…
            </span>
          )}
        </div>
        <div className="mt-2 text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatUSD(summary.fair_value)}
        </div>
        {summary.mc_p10 !== null && summary.mc_p90 !== null && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Monte Carlo 80% CI: {formatUSD(summary.mc_p10)} –{" "}
            {formatUSD(summary.mc_p90)} (median{" "}
            {summary.mc_median !== null ? formatUSD(summary.mc_median) : "—"})
          </p>
        )}
        <dl className="mt-4 grid grid-cols-3 gap-4">
          <Stat
            label="Enterprise value"
            value={formatBillions(summary.enterprise_value)}
          />
          <Stat label="Net debt" value={formatBillions(summary.net_debt)} />
          <Stat
            label="Equity value"
            value={formatBillions(summary.equity_value)}
          />
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Assumptions
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Adjust the sliders — fair value, Monte Carlo, and sensitivity update
          automatically.
        </p>
        <div className="mt-6">
          <AssumptionsPanel value={assumptions} onChange={setAssumptions} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Monte Carlo distribution
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            10,000 iterations across the 4 key drivers
          </p>
          <div className="mt-4">
            {valuation.monte_carlo && (
              <MonteCarloChart result={valuation.monte_carlo} />
            )}
          </div>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Sensitivity (revenue growth × operating margin)
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Per-share fair value at each cell
          </p>
          <div className="mt-4">
            {valuation.sensitivity && (
              <SensitivityHeatmap grid={valuation.sensitivity} />
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          5-year projection
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4 font-medium">Year</th>
                <th className="py-2 pr-4 font-medium">Revenue</th>
                <th className="py-2 pr-4 font-medium">Op income</th>
                <th className="py-2 pr-4 font-medium">NOPAT</th>
                <th className="py-2 pr-4 font-medium">Capex</th>
                <th className="py-2 pr-4 font-medium">D&amp;A</th>
                <th className="py-2 pr-4 font-medium">FCFF</th>
              </tr>
            </thead>
            <tbody className="text-zinc-900 dark:text-zinc-100">
              {valuation.projection.years.map((y) => (
                <tr
                  key={y.year}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="py-2 pr-4">+{y.year}y</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatBillions(y.revenue)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatBillions(y.operating_income)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatBillions(y.nopat)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatBillions(y.capital_expenditures)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatBillions(y.depreciation_amortization)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums font-medium">
                    {formatBillions(y.free_cash_flow)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Terminal value: {formatBillions(valuation.projection.terminal_value)}{" "}
            (Gordon growth at {formatPercent(assumptions.terminal_growth)})
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}

function ExtractStat({
  label,
  item,
}: {
  label: string;
  item: LineItem | null;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
        {item ? formatBillions(item.value) : "—"}
      </dd>
      {item && (
        <dd className="mt-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-500">
          {item.source} · conf {item.confidence.toFixed(2)}
        </dd>
      )}
      {item?.source_quote && (
        <dd
          className="mt-1 truncate text-[11px] italic text-zinc-600 dark:text-zinc-400"
          title={item.source_quote}
        >
          “{item.source_quote.replace(/\s+/g, " ").trim()}”
        </dd>
      )}
      {item?.xbrl_tag && !item.source_quote && (
        <dd
          className="mt-1 truncate font-mono text-[10px] text-zinc-600 dark:text-zinc-400"
          title={item.xbrl_tag}
        >
          {item.xbrl_tag}
        </dd>
      )}
    </div>
  );
}
