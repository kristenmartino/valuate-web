"use client";

import { type FinancialPeriod, type LineItem, formatBillions } from "@/lib/api";

type Props = {
  periods: FinancialPeriod[]; // newest-first
};

// Display order + human labels per statement. Order matches the standard
// 10-K presentation rather than the schema's internal ordering.
const INCOME_FIELDS: Array<[keyof FinancialPeriod["income_statement"], string]> = [
  ["revenue", "Revenue"],
  ["cost_of_revenue", "Cost of revenue"],
  ["gross_profit", "Gross profit"],
  ["research_and_development", "Research and development"],
  ["selling_general_administrative", "Selling, general and administrative"],
  ["depreciation_amortization", "Depreciation and amortization"],
  ["operating_income", "Operating income"],
  ["interest_expense", "Interest expense"],
  ["income_before_tax", "Income before tax"],
  ["income_tax_expense", "Income tax expense"],
  ["net_income", "Net income"],
  ["diluted_shares_outstanding", "Diluted shares outstanding"],
];

const BALANCE_FIELDS: Array<[keyof FinancialPeriod["balance_sheet"], string]> = [
  ["cash_and_equivalents", "Cash and equivalents"],
  ["short_term_investments", "Short-term investments"],
  ["accounts_receivable", "Accounts receivable"],
  ["inventory", "Inventory"],
  ["total_current_assets", "Total current assets"],
  ["property_plant_equipment_net", "Property, plant & equipment (net)"],
  ["total_assets", "Total assets"],
  ["accounts_payable", "Accounts payable"],
  ["short_term_debt", "Short-term debt"],
  ["total_current_liabilities", "Total current liabilities"],
  ["long_term_debt", "Long-term debt"],
  ["total_liabilities", "Total liabilities"],
  ["shareholders_equity", "Shareholders' equity"],
];

const CASHFLOW_FIELDS: Array<
  [keyof FinancialPeriod["cash_flow_statement"], string]
> = [
  ["depreciation_amortization", "Depreciation and amortization"],
  ["cash_from_operations", "Cash from operations"],
  ["capital_expenditures", "Capital expenditures"],
  ["cash_from_investing", "Cash from investing"],
  ["cash_from_financing", "Cash from financing"],
];

function tooltipFor(item: LineItem): string {
  const lines = [
    `source: ${item.source} · conf ${item.confidence.toFixed(2)}`,
  ];
  if (item.source_quote) {
    lines.push(`“${item.source_quote.replace(/\s+/g, " ").trim()}”`);
  } else if (item.xbrl_tag) {
    lines.push(item.xbrl_tag);
  }
  return lines.join("\n");
}

function ProvenanceCell({ item }: { item: LineItem | null }) {
  if (!item) return <span className="text-zinc-400">—</span>;
  return (
    <div
      className="text-right"
      title={tooltipFor(item)}
    >
      <div className="tabular-nums">
        {item.value === "0" || item.value === "0.00"
          ? "0"
          : item.source === "user_override" || item.source === "derived"
          ? formatBillions(item.value)
          : formatBillions(item.value)}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        {item.source} · {item.confidence.toFixed(2)}
      </div>
    </div>
  );
}

function StatementTable<K extends string>({
  title,
  fields,
  periods,
  pickItem,
}: {
  title: string;
  fields: Array<[K, string]>;
  periods: FinancialPeriod[];
  pickItem: (period: FinancialPeriod, key: K) => LineItem | null;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
        {title}
      </h4>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-2 pr-4 text-left font-medium">Line item</th>
              {periods.map((p) => (
                <th
                  key={p.fiscal_year}
                  className="py-2 pl-4 text-right font-medium"
                >
                  FY{p.fiscal_year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(([key, label]) => (
              <tr
                key={key}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-100">
                  {label}
                </td>
                {periods.map((p) => (
                  <td key={p.fiscal_year} className="py-2 pl-4">
                    <ProvenanceCell item={pickItem(p, key)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StatementsPanel({ periods }: Props) {
  if (periods.length === 0) return null;
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Extracted statements
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every line item the agent pulled, side-by-side across {periods.length} fiscal year
          {periods.length === 1 ? "" : "s"}. Hover any cell to see its source, confidence, and
          verbatim quote (or XBRL tag for Track A items).
        </p>
      </header>

      <div className="mt-6 space-y-8">
        <StatementTable
          title="Income statement"
          fields={INCOME_FIELDS}
          periods={periods}
          pickItem={(p, k) =>
            p.income_statement[
              k as keyof typeof p.income_statement
            ] as LineItem | null
          }
        />
        <StatementTable
          title="Balance sheet"
          fields={BALANCE_FIELDS}
          periods={periods}
          pickItem={(p, k) =>
            p.balance_sheet[k as keyof typeof p.balance_sheet] as LineItem | null
          }
        />
        <StatementTable
          title="Cash flow statement"
          fields={CASHFLOW_FIELDS}
          periods={periods}
          pickItem={(p, k) =>
            p.cash_flow_statement[
              k as keyof typeof p.cash_flow_statement
            ] as LineItem | null
          }
        />
      </div>
    </section>
  );
}
