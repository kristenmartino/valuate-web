import type { Assumptions, Industry } from "./api";

export function assumptionIssue(a: Assumptions, industry: Industry): string | null {
  if (industry !== "energy" && a.wacc <= a.terminal_growth) {
    const rate = industry === "standard" ? "WACC" : "Cost of equity";
    const growth = { standard: "terminal growth", bank: "dividend growth", insurer: "long-term growth", reit: "approximate FFO growth" }[industry];
    return `${rate} (${(a.wacc * 100).toFixed(2)}%) must exceed ${growth} (${(a.terminal_growth * 100).toFixed(2)}%). Raise ${rate.toLowerCase()} or lower growth to recalculate.`;
  }
  if (industry === "insurer" && a.operating_margin <= a.terminal_growth) {
    return "Return on equity must exceed long-term growth for the justified price-to-book model. Raise ROE or lower growth to recalculate.";
  }
  return null;
}
