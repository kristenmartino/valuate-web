import { type Company, type ExtractionFlag, isShareField, lookupLineItem } from "./api";

const BALANCE_SHEET_FIELDS = [
  { fieldPath: "balance_sheet.total_assets", label: "Total assets" },
  { fieldPath: "balance_sheet.total_liabilities", label: "Total liabilities" },
  { fieldPath: "balance_sheet.shareholders_equity", label: "Shareholders' equity" },
] as const;

export function correctionOptions(company: Company, flag: ExtractionFlag) {
  const fields = flag.field_path === "balance_sheet"
    ? BALANCE_SHEET_FIELDS
    : [{
        fieldPath: flag.field_path,
        label: flag.field_path.split(".").at(-1)!.replaceAll("_", " "),
      }];

  return fields.flatMap(({ fieldPath, label }) => {
    if (!/^(income_statement|balance_sheet|cash_flow_statement)\.[a-z_]+$/.test(fieldPath)) return [];
    const item = lookupLineItem(company, fieldPath);
    return item ? [{ fieldPath, label, item }] : [];
  });
}

// Values are submitted in base units, matching the override API's Decimal.
export function parseCorrectionValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase().replace(/[$,\s]/g, "");
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/);
  if (!match) return null;
  const multipliers: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };
  const multiplier = multipliers[match[2] ?? ""] ?? 1;
  const number = Number(match[1]) * multiplier;
  return Number.isFinite(number) ? Math.round(number).toString() : null;
}

export function correctionRequest(
  company: Company,
  flag: ExtractionFlag,
  fieldPath: string,
  rawValue: string,
  sourceQuote: string,
) {
  if (!correctionOptions(company, flag).some((option) => option.fieldPath === fieldPath)) {
    throw new Error("Choose a specific field to correct.");
  }
  const value = isShareField(fieldPath) && rawValue.includes("$")
    ? null
    : parseCorrectionValue(rawValue);
  if (value === null) throw new Error("Enter a valid number before saving.");
  return { field_path: fieldPath, value, source_quote: sourceQuote.trim() || null };
}
