import type { LineItem } from "./api";

const COMPONENT_LABELS: Record<string, Record<string, string>> = {
  shareholders_equity: {
    "us-gaap:StockholdersEquity": "Parent shareholders' equity",
    "us-gaap:StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest": "Equity including noncontrolling interests",
  },
  investments: {
    "us-gaap:Investments": "Reported investments",
    "us-gaap:AvailableForSaleSecuritiesDebtSecurities": "Fixed-maturity securities (available for sale)",
    "us-gaap:DebtSecuritiesAvailableForSaleExcludingAccruedInterest": "Available-for-sale debt securities (excluding accrued interest)",
  },
  insurance_reserves: {
    "us-gaap:LiabilityForFuturePolicyBenefits": "Future policy benefits",
    "us-gaap:LiabilityForFuturePolicyBenefitsAndUnpaidClaimsAndClaimsAdjustmentExpense": "Future policy benefits + unpaid claims and adjustment expenses",
    "us-gaap:LiabilityForUnpaidClaimsAndClaimsAdjustmentExpense": "Unpaid claims and adjustment expenses",
  },
};

const UNSPECIFIED_LABELS: Record<string, string> = {
  shareholders_equity: "Shareholders' equity (coverage unspecified)",
  investments: "Investment amount (coverage unspecified)",
  insurance_reserves: "Policy or claims liability (coverage unspecified)",
};

// These schema slots accept both totals and components. A shared row label
// must not imply equal coverage when periods use different source concepts.
export function statementRowLabels(field: string, fallback: string, items: Array<LineItem | null>) {
  const concepts = COMPONENT_LABELS[field];
  if (!concepts) return { label: fallback, cellLabels: items.map(() => null) };
  const labels = items.map(item => item
    ? (item.source === "xbrl" && item.xbrl_tag && concepts[item.xbrl_tag]) || UNSPECIFIED_LABELS[field]
    : null);
  const distinct = new Set(labels.filter((label): label is string => label !== null));
  if (distinct.size <= 1) {
    return { label: labels.find(label => label !== null) ?? UNSPECIFIED_LABELS[field], cellLabels: items.map(() => null) };
  }
  return {
    label: field === "shareholders_equity" ? "Equity (different coverage)"
      : field === "investments" ? "Investment amounts (different coverage)" : "Policy and claims liabilities (different coverage)",
    cellLabels: labels,
  };
}
