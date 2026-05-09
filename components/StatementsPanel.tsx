"use client";

import { type FinancialPeriod, type LineItem, formatBillions } from "@/lib/api";

type Props = {
  periods: FinancialPeriod[]; // newest-first; all share the same industry
};

// Display order + human labels per statement, per industry. Order matches
// the standard 10-K presentation rather than the schema's internal ordering.

const STANDARD_FIELDS: {
  income: Array<[string, string]>;
  balance: Array<[string, string]>;
  cashflow: Array<[string, string]>;
} = {
  income: [
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
  ],
  balance: [
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
  ],
  cashflow: [
    ["depreciation_amortization", "Depreciation and amortization"],
    ["cash_from_operations", "Cash from operations"],
    ["capital_expenditures", "Capital expenditures"],
    ["cash_from_investing", "Cash from investing"],
    ["cash_from_financing", "Cash from financing"],
    ["dividends_paid", "Dividends paid"],
  ],
};

const BANK_FIELDS: {
  income: Array<[string, string]>;
  balance: Array<[string, string]>;
  cashflow: Array<[string, string]>;
} = {
  income: [
    ["interest_income", "Interest income"],
    ["interest_expense", "Interest expense"],
    ["net_interest_income", "Net interest income"],
    ["provision_for_credit_losses", "Provision for credit losses"],
    ["non_interest_income", "Non-interest income"],
    ["non_interest_expense", "Non-interest expense"],
    ["income_before_tax", "Income before tax"],
    ["income_tax_expense", "Income tax expense"],
    ["net_income", "Net income"],
    ["diluted_shares_outstanding", "Diluted shares outstanding"],
  ],
  balance: [
    ["cash_and_equivalents", "Cash and equivalents"],
    ["securities", "Securities"],
    ["total_loans", "Total loans (net of allowance)"],
    ["allowance_for_loan_losses", "Allowance for loan losses"],
    ["total_deposits", "Total deposits"],
    ["long_term_debt", "Long-term debt"],
    ["total_assets", "Total assets"],
    ["total_liabilities", "Total liabilities"],
    ["shareholders_equity", "Shareholders' equity"],
  ],
  cashflow: [
    ["cash_from_operations", "Cash from operations"],
    ["cash_from_investing", "Cash from investing"],
    ["cash_from_financing", "Cash from financing"],
    ["dividends_paid", "Dividends paid"],
    ["depreciation_amortization", "Depreciation and amortization"],
    ["capital_expenditures", "Capital expenditures"],
  ],
};

const INSURANCE_FIELDS: {
  income: Array<[string, string]>;
  balance: Array<[string, string]>;
  cashflow: Array<[string, string]>;
} = {
  income: [
    ["premiums_earned", "Premiums earned, net"],
    ["net_investment_income", "Net investment income"],
    ["benefits_and_claims", "Policyholder benefits and claims"],
    ["operating_expenses", "Operating expenses"],
    ["income_before_tax", "Income before tax"],
    ["income_tax_expense", "Income tax expense"],
    ["net_income", "Net income"],
    ["diluted_shares_outstanding", "Diluted shares outstanding"],
  ],
  balance: [
    ["cash_and_equivalents", "Cash and equivalents"],
    ["investments", "Investments (general account)"],
    ["insurance_reserves", "Future policy benefits + unpaid claims"],
    ["total_assets", "Total assets"],
    ["total_liabilities", "Total liabilities"],
    ["shareholders_equity", "Shareholders' equity"],
  ],
  cashflow: [
    ["cash_from_operations", "Cash from operations"],
    ["cash_from_investing", "Cash from investing"],
    ["cash_from_financing", "Cash from financing"],
    ["dividends_paid", "Dividends paid"],
    ["depreciation_amortization", "Depreciation and amortization"],
    ["capital_expenditures", "Capital expenditures"],
  ],
};

const REIT_FIELDS: {
  income: Array<[string, string]>;
  balance: Array<[string, string]>;
  cashflow: Array<[string, string]>;
} = {
  income: [
    ["revenue", "Revenue (rental + service income)"],
    ["property_operating_expense", "Property operating expense"],
    ["depreciation_amortization", "Depreciation and amortization"],
    ["general_and_administrative", "General and administrative"],
    ["operating_income", "Operating income"],
    ["interest_expense", "Interest expense"],
    ["income_before_tax", "Income before tax"],
    ["income_tax_expense", "Income tax expense"],
    ["net_income", "Net income"],
    ["diluted_shares_outstanding", "Diluted shares outstanding"],
  ],
  balance: [
    ["cash_and_equivalents", "Cash and equivalents"],
    ["real_estate_at_cost", "Real estate (at cost)"],
    ["accumulated_depreciation", "Accumulated depreciation"],
    ["real_estate_net", "Real estate (net)"],
    ["total_assets", "Total assets"],
    ["long_term_debt", "Long-term debt"],
    ["total_liabilities", "Total liabilities"],
    ["shareholders_equity", "Shareholders' equity"],
  ],
  cashflow: [
    ["cash_from_operations", "Cash from operations"],
    ["cash_from_investing", "Cash from investing"],
    ["cash_from_financing", "Cash from financing"],
    ["dividends_paid", "Dividends paid"],
    ["depreciation_amortization", "Depreciation and amortization"],
    ["capital_expenditures", "Capital expenditures"],
  ],
};

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
    <div className="text-right" title={tooltipFor(item)}>
      <div className="tabular-nums">{formatBillions(item.value)}</div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        {item.source} · {item.confidence.toFixed(2)}
      </div>
    </div>
  );
}

function pickItem(
  period: FinancialPeriod,
  statement: "income" | "balance" | "cashflow",
  key: string,
): LineItem | null {
  const stmt =
    statement === "income"
      ? period.income_statement
      : statement === "balance"
      ? period.balance_sheet
      : period.cash_flow_statement;
  // Fields not present on this variant come back as undefined; treat as null.
  return ((stmt as unknown as Record<string, LineItem | null | undefined>)[key]) ?? null;
}

function StatementTable({
  title,
  fields,
  periods,
  statement,
}: {
  title: string;
  fields: Array<[string, string]>;
  periods: FinancialPeriod[];
  statement: "income" | "balance" | "cashflow";
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
                <th key={p.fiscal_year} className="py-2 pl-4 text-right font-medium">
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
                    <ProvenanceCell item={pickItem(p, statement, key)} />
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
  const industry = periods[0].industry;
  const fields =
    industry === "bank"
      ? BANK_FIELDS
      : industry === "insurer"
      ? INSURANCE_FIELDS
      : industry === "reit"
      ? REIT_FIELDS
      : STANDARD_FIELDS;
  const labelFor = (s: string) =>
    industry === "standard" ? s : `${s} (${industry})`;
  const incomeTitle = labelFor("Income statement");
  const balanceTitle = labelFor("Balance sheet");

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
          title={incomeTitle}
          fields={fields.income}
          periods={periods}
          statement="income"
        />
        <StatementTable
          title={balanceTitle}
          fields={fields.balance}
          periods={periods}
          statement="balance"
        />
        <StatementTable
          title="Cash flow statement"
          fields={fields.cashflow}
          periods={periods}
          statement="cashflow"
        />
      </div>
    </section>
  );
}
