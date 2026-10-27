import type { LineItem } from "./api";

export function isCiscoCombinedDa(item: LineItem | null | undefined) {
  return item?.source === "xbrl" && item.xbrl_tag === "csco:DepreciationAmortizationAndOther";
}

export function isAdobeAccretionDa(item: LineItem | null | undefined, cik?: string) {
  return cik?.replace(/^0+/, "") === "796343" && item?.source === "xbrl" && item.xbrl_tag === "us-gaap:DepreciationDepletionAndAmortization";
}

export function isAlphabetPpeDa(item: LineItem | null | undefined, cik?: string) {
  return cik?.replace(/^0+/, "") === "1652044" && item?.source === "xbrl" && item.xbrl_tag === "us-gaap:Depreciation";
}

const COMPONENT_LABELS: Record<string, Record<string, string>> = {
  accounts_payable: {
    "us-gaap:AccountsPayableCurrent": "Accounts payable",
    "us-gaap:AccountsPayableAndOtherAccruedLiabilitiesCurrent": "Accounts payable, accrued expenses and other liabilities",
  },
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
  accounts_payable: "Payables or accrued liabilities (coverage unspecified)",
  shareholders_equity: "Shareholders' equity (coverage unspecified)",
  investments: "Investment amount (coverage unspecified)",
  insurance_reserves: "Policy or claims liability (coverage unspecified)",
};

// These schema slots accept both totals and components. A shared row label
// must not imply equal coverage when periods use different source concepts.
export function statementRowLabels(field: string, fallback: string, items: Array<LineItem | null>, context?: { cik?: string; legacyDebt?: boolean[] }) {
  if (field === "depreciation_amortization" && items.some(item => isAdobeAccretionDa(item, context?.cik))) {
    const labels = items.map(item => !item ? null : isAdobeAccretionDa(item, context?.cik) ? "Depreciation, amortization and accretion" : "Add-back (coverage unspecified)");
    return new Set(labels.filter(Boolean)).size <= 1
      ? { label: "Depreciation, amortization and accretion", cellLabels: items.map(() => null) }
      : { label: "Add-backs (different coverage)", cellLabels: labels };
  }
  if (field === "long_term_debt" && context?.cik?.replace(/^0+/, "") === "796343" && items.some(item => item?.source === "xbrl" && item.xbrl_tag === "us-gaap:LongTermDebt" && item.source_quote?.startsWith("Noncurrent debt, excluding current maturities."))) {
    const labels = items.map(item => !item ? null : item.source === "xbrl" && item.xbrl_tag === "us-gaap:LongTermDebt" && item.source_quote?.startsWith("Noncurrent debt, excluding current maturities.")
      ? "Noncurrent debt (filed carrying amount)" : "Debt amount (coverage unspecified)");
    return new Set(labels.filter(Boolean)).size <= 1
      ? { label: labels.find(Boolean) ?? fallback, cellLabels: items.map(() => null) }
      : { label: "Debt amounts (different coverage)", cellLabels: labels };
  }
  if (field === "depreciation_amortization" && context?.cik?.replace(/^0+/, "") === "821189" && items.every(item => !item || (item.source === "xbrl" && item.xbrl_tag === "us-gaap:DepreciationDepletionAndAmortization"))) {
    return { label: "Depreciation, depletion and amortization", cellLabels: items.map(() => null) };
  }
  if (context?.cik?.replace(/^0+/, "") === "1652044" && ["depreciation_amortization", "short_term_debt", "long_term_debt"].includes(field)) {
    const labels = items.map((item, i) => !item ? null : field === "depreciation_amortization"
      ? isAlphabetPpeDa(item, context.cik) ? "PP&E depreciation (proxy)" : "Add-back (coverage unspecified)"
      : item.source === "user_override" ? "Debt (reviewed; see source details)"
      : field === "long_term_debt" ? context.legacyDebt?.[i] ? "Noncurrent debt including finance leases" : "Noncurrent debt"
      : context.legacyDebt?.[i] ? "Current debt including finance leases" : "Current maturities + commercial paper");
    const distinct = new Set(labels.filter(Boolean));
    return distinct.size <= 1
      ? { label: labels.find(Boolean) ?? fallback, cellLabels: items.map(() => null) }
      : { label: field === "depreciation_amortization" ? "Add-backs (different coverage)" : field === "long_term_debt" ? "Noncurrent debt (different coverage)" : "Current debt (different coverage)", cellLabels: labels };
  }
  if (field === "depreciation_amortization" && items.some(isCiscoCombinedDa)) {
    const labels = items.map(item => !item ? null : isCiscoCombinedDa(item)
      ? "Depreciation, amortization and other" : "D&A amount (coverage unspecified)");
    const distinct = new Set(labels.filter(Boolean));
    return distinct.size <= 1
      ? { label: "Depreciation, amortization and other", cellLabels: items.map(() => null) }
      : { label: "D&A adjustments (different coverage)", cellLabels: labels };
  }
  if (field === "depreciation_amortization" && items.some(item => item?.source === "xbrl" && ["us-gaap:Depreciation", "us-gaap:DepreciationDepletionAndAmortizationPropertyPlantAndEquipment"].includes(item.xbrl_tag ?? ""))) {
    const labels = items.map(item => !item ? null : item.source === "xbrl" && item.xbrl_tag === "us-gaap:Depreciation"
      ? "Depreciation (component; full D&A unverified)"
      : item.source === "xbrl" && item.xbrl_tag === "us-gaap:DepreciationDepletionAndAmortizationPropertyPlantAndEquipment"
      ? "PP&E depreciation and amortization (component)" : "Add-back (see source details)");
    return new Set(labels.filter(Boolean)).size <= 1
      ? { label: labels.find(Boolean) ?? fallback, cellLabels: items.map(() => null) }
      : { label: "Add-backs (different coverage)", cellLabels: labels };
  }
  if (field === "long_term_debt" && items.some(item => item?.source === "xbrl" && item.xbrl_tag === "us-gaap:LongTermDebt")) {
    const labels = items.map(item => !item ? null : item.source === "xbrl" && item.xbrl_tag === "us-gaap:LongTermDebt"
      ? "Debt amount (basis/current split unverified)"
      : item.source === "xbrl" && item.xbrl_tag === "us-gaap:LongTermDebtNoncurrent" ? "Noncurrent debt" : "Debt amount (coverage unspecified)");
    return new Set(labels.filter(Boolean)).size <= 1
      ? { label: labels.find(Boolean) ?? fallback, cellLabels: items.map(() => null) }
      : { label: "Debt amounts (different coverage)", cellLabels: labels };
  }
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
      : field === "investments" ? "Investment amounts (different coverage)"
      : field === "accounts_payable" ? "Payables and accrued liabilities (different coverage)" : "Policy and claims liabilities (different coverage)",
    cellLabels: labels,
  };
}
