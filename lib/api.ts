// Type definitions mirror the FastAPI Pydantic schemas. Decimal fields come
// over the wire as strings (per the json_encoder on LineItem); we parse them
// at the display boundary, not here, to keep precision.

export type LineItemSource = "xbrl" | "llm_html" | "user_override" | "derived";

export type LineItem = {
  value: string;
  source: LineItemSource;
  confidence: number;
  source_quote: string | null;
  xbrl_tag: string | null;
};

export type RevenueSegment = {
  name: string;
  revenue: LineItem;
};

export type Industry = "standard" | "bank" | "insurer" | "reit" | "energy";

// Discriminated union: each variant has a `kind` literal that lets TypeScript
// narrow the type after a check. Standard = industrials/tech (default);
// banks have a fundamentally different shape (no revenue, no operating margin).

export type IncomeStatement = {
  kind: "standard";
  revenue: LineItem;
  cost_of_revenue: LineItem | null;
  gross_profit: LineItem | null;
  research_and_development: LineItem | null;
  selling_general_administrative: LineItem | null;
  depreciation_amortization: LineItem | null;
  operating_income: LineItem;
  interest_expense: LineItem | null;
  income_before_tax: LineItem | null;
  income_tax_expense: LineItem | null;
  net_income: LineItem;
  diluted_shares_outstanding: LineItem;
  revenue_segments: RevenueSegment[] | null;
};

export type BankIncomeStatement = {
  kind: "bank";
  interest_income: LineItem | null;
  interest_expense: LineItem | null;
  net_interest_income: LineItem;
  provision_for_credit_losses: LineItem | null;
  non_interest_income: LineItem | null;
  non_interest_expense: LineItem | null;
  income_before_tax: LineItem;
  income_tax_expense: LineItem;
  net_income: LineItem;
  diluted_shares_outstanding: LineItem;
};

export type AnyIncomeStatement = IncomeStatement | BankIncomeStatement;

export type BalanceSheet = {
  kind: "standard";
  cash_and_equivalents: LineItem;
  short_term_investments: LineItem | null;
  accounts_receivable: LineItem | null;
  inventory: LineItem | null;
  total_current_assets: LineItem | null;
  property_plant_equipment_net: LineItem | null;
  total_assets: LineItem;
  accounts_payable: LineItem | null;
  short_term_debt: LineItem | null;
  total_current_liabilities: LineItem | null;
  long_term_debt: LineItem | null;
  total_liabilities: LineItem;
  shareholders_equity: LineItem;
};

export type BankBalanceSheet = {
  kind: "bank";
  cash_and_equivalents: LineItem;
  securities: LineItem | null;
  total_loans: LineItem;
  allowance_for_loan_losses: LineItem | null;
  total_deposits: LineItem;
  long_term_debt: LineItem | null;
  total_assets: LineItem;
  total_liabilities: LineItem;
  shareholders_equity: LineItem;
};

export type AnyBalanceSheet = BalanceSheet | BankBalanceSheet;

export type CashFlowStatement = {
  kind: "standard";
  depreciation_amortization: LineItem;
  cash_from_operations: LineItem;
  capital_expenditures: LineItem;
  cash_from_investing: LineItem | null;
  cash_from_financing: LineItem | null;
  dividends_paid: LineItem | null;
};

export type BankCashFlowStatement = {
  kind: "bank";
  cash_from_operations: LineItem;
  cash_from_investing: LineItem | null;
  cash_from_financing: LineItem | null;
  dividends_paid: LineItem | null;
  depreciation_amortization: LineItem | null;
  capital_expenditures: LineItem | null;
};

export type AnyCashFlowStatement = CashFlowStatement | BankCashFlowStatement;

export type FinancialPeriod = {
  fiscal_year: number;
  fiscal_period_end: string;
  filing_accession: string;
  filing_type: string;
  industry: Industry;
  income_statement: AnyIncomeStatement;
  balance_sheet: AnyBalanceSheet;
  cash_flow_statement: AnyCashFlowStatement;
};

export type ExtractionFlag = {
  field_path: string;
  reason: string;
  current_value: string;
  suggested_value: string | null;
};

export type Company = {
  ticker: string;
  cik: string;
  name: string;
  fiscal_year_end_month: number;
  periods: FinancialPeriod[];
  extraction_flags: ExtractionFlag[];
};

export type Assumptions = {
  revenue_growth: number;
  operating_margin: number;
  terminal_growth: number;
  wacc: number;
  tax_rate: number;
  capex_ratio: number;
  da_ratio: number;
  working_capital_ratio: number;
};

export type YearProjection = {
  year: number;
  revenue: number;
  operating_income: number;
  nopat: number;
  depreciation_amortization: number;
  capital_expenditures: number;
  change_in_working_capital: number;
  free_cash_flow: number;
};

export type Projection = {
  assumptions: Assumptions;
  base_year: number;
  base_revenue: number;
  years: YearProjection[];
  terminal_value: number;
  enterprise_value: number;
  net_debt: number;
  equity_value: number;
  diluted_shares: number;
  fair_value_per_share: number;
};

export type MonteCarloResult = {
  iterations_completed: number;
  mean: number;
  median: number;
  std_dev: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  histogram: [number, number][];
};

export type SensitivityGrid = {
  revenue_growth_axis: number[];
  operating_margin_axis: number[];
  values: (number | null)[][];
};

export type ValuationResponse = {
  projection: Projection;
  monte_carlo: MonteCarloResult | null;
  sensitivity: SensitivityGrid | null;
};

export type PeerMultiples = {
  ticker: string;
  name: string;
  market_cap: number | null;
  enterprise_value: number | null;
  revenue: number | null;
  ebitda: number | null;
  pe_ratio: number | null;
  ev_revenue: number | null;
  ev_ebitda: number | null;
};

export type CompsResponse = {
  target_ticker: string;
  target_market: PeerMultiples | null;
  peers: PeerMultiples[];
  median_pe: number | null;
  median_ev_revenue: number | null;
  median_ev_ebitda: number | null;
};

// --- fetchers ----------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getCompany(ticker: string): Promise<Company | null> {
  const res = await fetch(`/api/company/${ticker}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} GET /company/${ticker}`);
  return res.json();
}

export function postExtract(ticker: string): Promise<Company> {
  return request<Company>(`/extract`, {
    method: "POST",
    body: JSON.stringify({ ticker }),
  });
}

export function getDefaults(ticker: string): Promise<Assumptions> {
  return request<Assumptions>(`/value/${ticker}/defaults`);
}

export function postValue(
  ticker: string,
  body: {
    assumptions: Assumptions;
    monte_carlo?: { iterations?: number; seed?: number } | null;
    sensitivity?: {
      revenue_growth_steps?: number;
      operating_margin_steps?: number;
    } | null;
  },
): Promise<ValuationResponse> {
  return request<ValuationResponse>(`/value/${ticker}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function putOverride(
  ticker: string,
  body: {
    field_path: string;
    value: string;
    source_quote?: string | null;
  },
): Promise<Company> {
  return request<Company>(`/company/${ticker}/override`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function getComps(ticker: string): Promise<CompsResponse> {
  return request<CompsResponse>(`/comps/${ticker}`);
}

// --- accessors ---------------------------------------------------------------

/**
 * Look up a LineItem by ExtractionFlag-style path ("income_statement.revenue").
 * Returns null if the path doesn't resolve to a populated field.
 */
export function lookupLineItem(
  company: Company,
  fieldPath: string,
): LineItem | null {
  const [stmtName, fieldName] = fieldPath.split(".");
  if (!stmtName || !fieldName) return null;
  const period = company.periods[0];
  if (!period) return null;
  const statement = (period as unknown as Record<string, unknown>)[stmtName];
  if (!statement || typeof statement !== "object") return null;
  const item = (statement as Record<string, LineItem | null>)[fieldName];
  return item ?? null;
}

// --- formatters --------------------------------------------------------------

export function formatBillions(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `$${(n / 1e9).toFixed(1)}B`;
}

export function formatUSD(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}
