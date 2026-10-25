"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type Assumptions,
  type Company,
  type CompsResponse,
  type LineItem,
  type ValuationResponse,
  formatMoney,
  formatPercent,
  formatUSD,
  getCompany,
  getComps,
  getDefaults,
  postExtract,
  postValue,
} from "@/lib/api";
import { parseFetchError } from "@/lib/friendlyError";
import { assumptionIssue } from "@/lib/assumptionValidation";
import { assumptionsChanged } from "@/lib/assumptionControls";
import { recordTickerVisit } from "@/lib/recentlyViewed";

import AssumptionsPanel from "./AssumptionsPanel";
import CompsPanel from "./CompsPanel";
import FlagsPanel from "./FlagsPanel";
import LoadingStepper from "./LoadingStepper";
import MonteCarloChart from "./MonteCarloChart";
import SegmentsPanel from "./SegmentsPanel";
import SensitivityHeatmap from "./SensitivityHeatmap";
import StatementsPanel from "./StatementsPanel";
import SourceDetails from "./SourceDetails";
import ReitMetrics from "./ReitMetrics";

type LoadStatus =
  | { phase: "idle" }
  | { phase: "extracting"; message: string }
  | { phase: "ready" }
  | { phase: "error"; message: string };

export default function Workspace({ ticker }: { ticker: string }) {
  const [status, setStatus] = useState<LoadStatus>({ phase: "idle" });
  const [company, setCompany] = useState<Company | null>(null);
  const [assumptions, setAssumptions] = useState<Assumptions | null>(null);
  const [startingAssumptions, setStartingAssumptions] = useState<Assumptions | null>(null);
  const [valuation, setValuation] = useState<ValuationResponse | null>(null);
  const [comps, setComps] = useState<CompsResponse | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);

  // Initial load: ensure /company exists, fetch defaults, run first valuation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus({ phase: "extracting", message: "Checking for saved financials…" });
        let c = await getCompany(ticker);
        if (!c) {
          setStatus({
            phase: "extracting",
            message:
              "Fetching the SEC 10-K and extracting financial line items…",
          });
          c = await postExtract(ticker);
        }
        if (cancelled) return;
        setCompany(c);

        setStatus({ phase: "extracting", message: "Loading default assumptions..." });
        const a = await getDefaults(ticker);
        if (cancelled) return;
        setAssumptions(a);
        setStartingAssumptions({ ...a });

        setStatus({ phase: "extracting", message: "Computing initial valuation..." });
        const v = await postValue(ticker, {
          assumptions: a,
          monte_carlo: { iterations: 10000, seed: 42 },
          sensitivity: { revenue_growth_steps: 7, operating_margin_steps: 7 },
        });
        if (cancelled) return;
        setValuation(v);
        setStatus({ phase: "ready" });
        // Record a successful workspace visit for the home page's
        // RecentlyViewed chip row. localStorage-backed, per-browser.
        recordTickerVisit(ticker);

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

  // Monotonic request id so an earlier, slower /value response can't overwrite
  // a later one. Slider drags fire overlapping recompute() calls; the result
  // that must win is the last one SENT, not the last one to RESOLVE.
  const valuationRequestId = useRef(0);

  // Recompute helper used by both the debounced assumptions watcher and
  // the override flow (where the underlying line items just changed).
  async function recompute(currentAssumptions: Assumptions) {
    const requestId = ++valuationRequestId.current;
    if (company && assumptionIssue(currentAssumptions, company.periods[0].industry)) {
      setRecomputing(false);
      setRecomputeError(null);
      setPendingChanges(true);
      return;
    }
    setRecomputing(true);
    setRecomputeError(null);
    try {
      const v = await postValue(ticker, {
        assumptions: currentAssumptions,
        monte_carlo: { iterations: 10000, seed: 42 },
        sensitivity: { revenue_growth_steps: 7, operating_margin_steps: 7 },
      });
      // Ignore a stale response that a newer recompute has already superseded.
      if (requestId === valuationRequestId.current) {
        setValuation(v);
        setPendingChanges(false);
      }
    } catch (err) {
      if (requestId === valuationRequestId.current) {
        setRecomputeError(err instanceof Error ? err.message : String(err));
        setPendingChanges(true);
      }
    } finally {
      // Only the latest in-flight request controls the recomputing indicator.
      if (requestId === valuationRequestId.current) setRecomputing(false);
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
    setPendingChanges(true);
    if (assumptions) recompute(assumptions);
  }

  function handleAssumptionsChange(next: Assumptions) {
    ++valuationRequestId.current;
    setRecomputing(false);
    setRecomputeError(null);
    setPendingChanges(true);
    setAssumptions(next);
  }

  const period = company?.periods[0];
  const flagCount = company?.extraction_flags.length ?? 0;
  const inputIssue = assumptions && period ? assumptionIssue(assumptions, period.industry) : null;

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
  // so the user can compare against peer medians directly. Only computable
  // for standard-industry filers — banks don't have a "revenue" or
  // "EBITDA" line in the comparable sense.
  const dcfImplied = useMemo(() => {
    if (!period || !valuation) return null;
    if (period.income_statement.kind !== "standard") return null;
    if (period.cash_flow_statement.kind !== "standard") return null;
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
      <LoadingStepper
        message={status.phase === "extracting" ? status.message : "Loading..."}
      />
    );
  }

  if (status.phase === "error") {
    const friendly = parseFetchError(status.message);
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm font-medium text-red-900 dark:text-red-200">
          {friendly.title} — {ticker}
        </p>
        {friendly.hint && (
          <p className="mt-2 text-sm text-red-800 dark:text-red-300">
            {friendly.hint}
          </p>
        )}
        <details className="mt-3 text-xs text-red-700 dark:text-red-400">
          <summary className="cursor-pointer hover:underline">
            Raw error
          </summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {friendly.raw}
          </pre>
        </details>
      </div>
    );
  }

  if (!company || !assumptions || !startingAssumptions || !period || !valuation || !summary) {
    return null;
  }

  const modelName = {
    standard: "Five-year FCFF DCF",
    bank: "Dividend discount model",
    insurer: "Justified price-to-book",
    reit: "Gordon growth using approximate FFO",
    energy: "Ten-year FCFF, no terminal value",
  }[period.industry];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {company.name}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              FY{period.fiscal_year} 10-K · period ending{" "}
              {period.fiscal_period_end} · accession{" "}
              <span className="break-all font-mono">
                {period.filing_accession}
              </span>
            </p>
          </div>
          <a href="#review" className="text-sm font-medium text-teal-800 underline underline-offset-4 dark:text-teal-300">
            {flagCount > 0 ? `${flagCount} item${flagCount === 1 ? "" : "s"} to review` : "No automated flags"}
          </a>
        </div>
        <p className="mt-2 text-xs font-medium text-teal-800 dark:text-teal-300">{modelName}</p>
        {company.valuation_note && (
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{company.valuation_note}</p>
        )}
        <nav aria-label="Workspace sections" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
          <a className="underline underline-offset-4" href="#valuation">Valuation</a>
          <a className="underline underline-offset-4" href="#review">Review data</a>
          <a className="underline underline-offset-4" href="#statements">Sources &amp; statements</a>
          <a className="underline underline-offset-4" href="#simulation">Simulation</a>
        </nav>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {period.income_statement.kind === "bank" ? (
            <>
              <ExtractStat
                label="Net interest income"
                item={period.income_statement.net_interest_income}
              />
              <ExtractStat
                label="Income before tax"
                item={period.income_statement.income_before_tax}
              />
              <ExtractStat
                label="Net income"
                item={period.income_statement.net_income}
              />
              <ExtractStat
                label="Total assets"
                item={period.balance_sheet.total_assets}
              />
            </>
          ) : period.income_statement.kind === "insurer" ? (
            <>
              <ExtractStat
                label="Premiums earned"
                item={period.income_statement.premiums_earned}
              />
              <ExtractStat
                label="Net investment income"
                item={period.income_statement.net_investment_income}
              />
              <ExtractStat
                label="Net income"
                item={period.income_statement.net_income}
              />
              <ExtractStat
                label="Total assets"
                item={period.balance_sheet.total_assets}
              />
            </>
          ) : period.income_statement.kind === "reit" ? (
            <>
              <ExtractStat
                label="Revenue"
                item={period.income_statement.revenue}
              />
              <ExtractStat
                label="Net income"
                item={period.income_statement.net_income}
              />
              <ExtractStat
                label="D&A (approximate FFO add-back)"
                item={period.income_statement.depreciation_amortization}
              />
              <ExtractStat
                label="Real estate (net)"
                item={
                  period.balance_sheet.kind === "reit"
                    ? period.balance_sheet.real_estate_net
                    : null
                }
              />
            </>
          ) : (
            <>
              <ExtractStat label="Revenue" item={period.income_statement.revenue} />
              <ExtractStat
                label="Operating income"
                item={period.income_statement.operating_income}
              />
              <ExtractStat label="Net income" item={period.income_statement.net_income} />
              <ExtractStat label="Total assets" item={period.balance_sheet.total_assets} />
            </>
          )}
        </dl>
      </section>

      <div id="valuation" className="grid scroll-mt-6 grid-cols-1 items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 sm:p-6 dark:border-teal-900 dark:bg-teal-950/20">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Estimated value per share
          </h3>
          {recomputing && (
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              recomputing…
            </span>
          )}
        </div>
        <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {formatUSD(summary.fair_value)}
        </div>
        {summary.mc_p10 !== null && summary.mc_p90 !== null && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Middle 80% of simulated valuations: {formatUSD(summary.mc_p10)} –{" "}
            {formatUSD(summary.mc_p90)} (median{" "}
            {summary.mc_median !== null ? formatUSD(summary.mc_median) : "—"})
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">An estimate under the selected assumptions, not a quoted stock price.</p>
        {(pendingChanges || recomputing) && (
          <p role="status" className="mt-4 border-l-2 border-amber-500 pl-3 text-sm text-amber-800 dark:text-amber-300">
            {inputIssue ? "Adjust the inputs to recalculate. Displayed results reflect the previous successful calculation." : recomputeError ? "Update failed. Displayed results reflect the previous successful calculation." : "Updating. Displayed results reflect the previous successful calculation."}
          </p>
        )}
        {inputIssue && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{inputIssue}</p>}
        {recomputeError && !inputIssue && <div role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300"><p>{parseFetchError(recomputeError).title}</p><p className="mt-1">{parseFetchError(recomputeError).hint}</p><button type="button" className="mt-2 underline underline-offset-4" onClick={() => recompute(assumptions)}>Retry calculation</button></div>}
        <dl className={`mt-4 grid grid-cols-1 gap-4 ${
          period.industry === "standard" || period.industry === "energy"
            ? "sm:grid-cols-3"
            : ""
        }`}>
          {(period.industry === "standard" || period.industry === "energy") && (
            <>
              <Stat
                label="Enterprise value"
                value={formatMoney(summary.enterprise_value)}
              />
              <Stat label="Net debt" value={formatMoney(summary.net_debt)} />
            </>
          )}
          <Stat label="Equity value" value={formatMoney(summary.equity_value)} />
        </dl>
        {period.industry === "reit" && (
          <ReitMetrics period={period} projection={valuation.projection} />
        )}
        {period.industry === "energy" &&
          valuation.projection.smog_per_share !== null && (
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <Stat
                label="Standardized measure / share (cross-check)"
                value={formatUSD(valuation.projection.smog_per_share)}
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                Discounted future net cash flows from the filing’s supplementary reserve disclosure, after estimated income taxes. This is a cross-check; the main estimate uses the ten-year cash-flow projection.
              </p>
            </div>
          )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Assumptions
          </h3>
          <button
            type="button"
            disabled={!assumptionsChanged(assumptions, startingAssumptions)}
            onClick={() => handleAssumptionsChange({ ...startingAssumptions })}
            title="Restore all values loaded when this workspace opened."
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Restore starting assumptions
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Adjust the inputs to recalculate the estimate and simulation.
        </p>
        <div className="mt-6">
          <AssumptionsPanel
            value={assumptions}
            startingValues={startingAssumptions}
            onChange={handleAssumptionsChange}
            industry={period.industry}
          />
        </div>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
          Restore returns every assumption to its exact value when this workspace opened.
        </p>
      </section>

      </div>

      <section id="review" className="scroll-mt-6 border-y border-zinc-200 py-5 dark:border-zinc-800">
        <h3 className="text-lg font-semibold">Data review</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{flagCount > 0 ? `${flagCount} item${flagCount === 1 ? "" : "s"} triggered automated checks.` : "No items triggered automated checks."} These checks do not verify every figure against the filing.</p>
        <details className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          <summary className="cursor-pointer py-1 text-teal-800 underline underline-offset-4 dark:text-teal-300">How sources and review flags work</summary>
          <div className="mt-3 max-w-3xl space-y-2 leading-relaxed">
            <p>SEC XBRL values come from tagged company facts or the filing’s inline XBRL. AI extraction fills gaps from filing text; calculated values use formulas; user corrections replace the saved current value.</p>
            <p>Internal XBRL scores are assigned by tag priority (1.0 for a primary tag; 0.95 for an alternate). AI scores are self-reported. Neither is a measured probability that a number is correct.</p>
            <p>Automated checks flag scores below 0.80 and balance-sheet discrepancies above 0.5%. Reconciliation adds reported noncontrolling interests to parent equity, without counting them twice when equity already includes them. A score above the threshold, or no flags, does not establish accuracy. Open source details and check important inputs against the filing.</p>
          </div>
        </details>
        <div className="mt-4"><FlagsPanel ticker={ticker} flags={company.extraction_flags} company={company} onOverride={handleOverride} /></div>
      </section>

      {period.income_statement.kind === "standard" &&
        period.income_statement.revenue_segments &&
        period.income_statement.revenue_segments.length > 0 && (
          <SegmentsPanel
            segments={period.income_statement.revenue_segments}
            totalRevenue={period.income_statement.revenue.value}
            fiscalYear={period.fiscal_year}
            coverageNote={company.cik.replace(/^0+/, "") === "1108524" ? "Five subscription and support service offerings plus professional services and other. These are revenue categories; Salesforce reports one operating segment." : undefined}
          />
        )}

      {comps && (comps.peers.length > 0 || comps.target_market) && (
        <CompsPanel comps={comps} dcfImplied={dcfImplied} />
      )}

      <div
        id="simulation"
        className={`scroll-mt-6 grid grid-cols-1 gap-6 ${
          period.industry === "standard" || period.industry === "energy"
            ? "lg:grid-cols-2"
            : ""
        }`}
      >
        <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Monte Carlo distribution
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {period.industry === "bank"
              ? "10,000 iterations sampling cost of equity and dividend growth"
              : period.industry === "insurer"
              ? "10,000 iterations sampling cost of equity, growth, and ROE"
              : period.industry === "reit"
              ? "10,000 iterations sampling cost of equity and approximate FFO growth"
              : period.industry === "energy"
              ? "10,000 iterations sampling revenue growth, op margin, and WACC"
              : "10,000 iterations across the 4 key drivers"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">The range describes simulated outputs under sampled assumptions. It is not a calibrated forecast of future stock prices.</p>
          <div className="mt-4">
            {valuation.monte_carlo && (
              <MonteCarloChart result={valuation.monte_carlo} />
            )}
          </div>
        </section>
        {/* Sensitivity (rev growth × op margin) is only meaningful for FCFF-
            shaped DCFs. For banks (DDM), insurers (justified P/B), and REITs
            (FFO multiple) those axes don't enter the model, so the heatmap
            would be uniform — hide. Energy E&P uses standard FCFF math (just
            with no terminal value), so the heatmap is meaningful. */}
        {(period.industry === "standard" || period.industry === "energy") && (
          <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Sensitivity (revenue growth × operating margin)
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Estimated value per share at each combination
            </p>
            <div className="mt-4">
              {valuation.sensitivity && (
                <SensitivityHeatmap grid={valuation.sensitivity} />
              )}
            </div>
          </section>
        )}
      </div>

      {valuation.projection.years.length > 0 && (
      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {valuation.projection.years.length}-year projection
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
                    {formatMoney(y.revenue)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatMoney(y.operating_income)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatMoney(y.nopat)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatMoney(y.capital_expenditures)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatMoney(y.depreciation_amortization)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums font-medium">
                    {formatMoney(y.free_cash_flow)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            {period.industry === "energy" ? (
              <>
                Terminal value: {formatMoney(valuation.projection.terminal_value)}{" "}
                (excluded by the fixed ten-year model; reserve life is not estimated)
              </>
            ) : (
              <>
                Terminal value: {formatMoney(valuation.projection.terminal_value)}{" "}
                (Gordon growth at {formatPercent(valuation.projection.assumptions.terminal_growth)})
              </>
            )}
          </p>
        </div>
      </section>
      )}

      <StatementsPanel periods={company.periods} shareCountLabel={company.share_count_label} />
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
        {item ? formatMoney(item.value) : "—"}
      </dd>
      {item && <dd><SourceDetails item={item} label={label} /></dd>}
    </div>
  );
}
