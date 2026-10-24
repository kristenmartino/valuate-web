import {
  type FinancialPeriod,
  type Projection,
  formatUSD,
} from "@/lib/api";

export default function ReitMetrics({
  period,
  projection,
}: {
  period: FinancialPeriod;
  projection: Projection;
}) {
  if (
    period.income_statement.kind !== "reit" ||
    (projection.ffo_per_share === null && projection.affo_per_share === null)
  ) {
    return null;
  }

  // Match the backend's AFFO branch: subtract positive reported capex;
  // otherwise use 80% of approximate FFO. Neither is company-reported AFFO.
  const capex = Number(period.cash_flow_statement.capital_expenditures?.value);
  const usesReportedCapex = Number.isFinite(capex) && capex > 0;

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2 dark:border-zinc-800">
      {projection.ffo_per_share !== null && (
        <div>
          <dl>
            <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Approximate FFO / share
            </dt>
            <dd className="mt-1 text-lg font-medium tabular-nums">
              {formatUSD(projection.ffo_per_share)}
            </dd>
          </dl>
          <details className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <summary className="cursor-pointer py-1 text-teal-800 underline underline-offset-4 dark:text-teal-300">
              Approximate FFO calculation
            </summary>
            <p className="mt-2 leading-relaxed">
              (Net income + D&amp;A) / diluted shares. This is the model input;
              other Nareit FFO adjustments are not modeled.
            </p>
            <dl className="mt-2 space-y-1">
              <div>
                <dt className="inline">Net income: </dt>
                <dd className="inline">{formatUSD(Number(period.income_statement.net_income.value))}</dd>
              </div>
              <div>
                <dt className="inline">D&amp;A: </dt>
                <dd className="inline">{formatUSD(Number(period.income_statement.depreciation_amortization.value))}</dd>
              </div>
              <div>
                <dt className="inline">Diluted shares: </dt>
                <dd className="inline">{`${projection.diluted_shares.toLocaleString("en-US", { maximumFractionDigits: 0 })} shares`}</dd>
              </div>
            </dl>
          </details>
        </div>
      )}
      {projection.affo_per_share !== null && (
        <div>
          <dl>
            <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Estimated AFFO / share
            </dt>
            <dd className="mt-1 text-lg font-medium tabular-nums">
              {formatUSD(projection.affo_per_share)}
            </dd>
          </dl>
          <details className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <summary className="cursor-pointer py-1 text-teal-800 underline underline-offset-4 dark:text-teal-300">
              Estimated AFFO calculation
            </summary>
            <p className="mt-2 leading-relaxed">
              {usesReportedCapex
                ? `(Approximate FFO − reported capital expenditures) / diluted shares. Reported capital expenditures: ${formatUSD(capex)}.`
                : "No positive reported capital expenditures are available. This fallback uses 80% of approximate FFO, divided by diluted shares."}
            </p>
            <p className="mt-2 leading-relaxed">
              A simplified estimate, not company-reported AFFO. Other adjustments
              are not modeled. This figure does not drive the valuation.
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
