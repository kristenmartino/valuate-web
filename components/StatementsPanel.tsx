"use client";

import { type FinancialPeriod, type LineItem, formatLineItem } from "@/lib/api";

import SourceDetails from "./SourceDetails";
import { statementRowLabels } from "@/lib/statementLabels";

type Props = {
  companyCik?: string;
  periods: FinancialPeriod[]; // newest-first; all share the same industry
  shareCountLabel?: string | null;
  operatingIncomeLabel?: string | null;
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
    ["share_based_compensation", "Stock-based compensation"],
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
    ["short_term_debt", "Current debt"],
    ["total_current_liabilities", "Total current liabilities"],
    ["long_term_debt", "Long-term debt"],
    ["total_liabilities", "Total liabilities"],
    ["shareholders_equity", "Shareholders' equity"],
    ["noncontrolling_interests", "Noncontrolling interests"],
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
    ["noncontrolling_interests", "Noncontrolling interests"],
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
    ["investments", "Investment amount (coverage unspecified)"],
    ["insurance_reserves", "Policy or claims liability (coverage unspecified)"],
    ["total_assets", "Total assets"],
    ["total_liabilities", "Total liabilities"],
    ["shareholders_equity", "Shareholders' equity"],
    ["noncontrolling_interests", "Noncontrolling interests"],
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
    ["noncontrolling_interests", "Noncontrolling interests"],
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

function ProvenanceCell({ item, field, label }: { item: LineItem | null; field: string; label: string }) {
  if (!item) return <span className="text-zinc-500">—</span>;
  return (
    <div className="min-w-32 text-right">
      <div className="tabular-nums">{formatLineItem(item.value, field)}</div>
      <SourceDetails item={item} label={label} />
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
  companyCik,
}: {
  title: string;
  fields: Array<[string, string]>;
  periods: FinancialPeriod[];
  statement: "income" | "balance" | "cashflow";
  companyCik?: string;
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
            {fields.map(([key, label]) => {
              const items = periods.map(p => pickItem(p, statement, key));
              const scope = statementRowLabels(key, label, items, { cik: companyCik, legacyDebt: periods.map(p => p.balance_sheet.kind === "standard" && p.balance_sheet.long_term_debt?.xbrl_tag === "us-gaap:LongTermDebtAndCapitalLeaseObligations") });
              return (
                <tr
                  key={key}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-100">
                    {scope.label}
                  </td>
                  {periods.map((p, index) => (
                    <td key={p.fiscal_year} className="py-2 pl-4">
                      {scope.cellLabels[index] && <p className="mb-1 text-right text-xs text-zinc-600 dark:text-zinc-400">{scope.cellLabels[index]}</p>}
                      <ProvenanceCell item={items[index]} field={key} label={`${scope.cellLabels[index] ?? scope.label}, FY${p.fiscal_year}`} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StatementsPanel({ periods, shareCountLabel, operatingIncomeLabel, companyCik }: Props) {
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
    <section id="statements" className="scroll-mt-6 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Extracted statements
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Extracted values across {periods.length} fiscal year{periods.length === 1 ? "" : "s"}. Open source details to inspect the stored excerpt or XBRL tag. A dash means no value is available; it does not mean zero.
        </p>
      </header>

      <div className="mt-6 space-y-8">
        <StatementTable
          title={incomeTitle}
          fields={fields.income.map(([key, label]) => [key, key === "diluted_shares_outstanding" && shareCountLabel ? shareCountLabel : key === "operating_income" && operatingIncomeLabel ? operatingIncomeLabel : label])}
          companyCik={companyCik}
          periods={periods}
          statement="income"
        />
        <StatementTable
          title={balanceTitle}
          fields={fields.balance}
          companyCik={companyCik}
          periods={periods}
          statement="balance"
        />
        <StatementTable
          title="Cash flow statement"
          fields={fields.cashflow}
          companyCik={companyCik}
          periods={periods}
          statement="cashflow"
        />
      </div>
    </section>
  );
}
