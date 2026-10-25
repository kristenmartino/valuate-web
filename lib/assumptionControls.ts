import type { Assumptions } from "./api";

type Range = { min: number; max: number; step: number };

/** Keep the current and starting values reachable, including off-grid defaults. */
export function sliderBounds(range: Range, value: number, startingValue: number) {
  return {
    min: Math.floor(Math.min(range.min, value, startingValue) / range.step) * range.step,
    max: Math.ceil(Math.max(range.max, value, startingValue) / range.step) * range.step,
  };
}

/** step=any preserves API precision; keep explicit keyboard increments. */
export function sliderKeyValue(key: string, value: number, range: Range): number | null {
  const changes: Record<string, number> = {
    ArrowLeft: -range.step,
    ArrowDown: -range.step,
    ArrowRight: range.step,
    ArrowUp: range.step,
    PageDown: -10 * range.step,
    PageUp: 10 * range.step,
  };
  if (key === "Home") return range.min;
  if (key === "End") return range.max;
  if (!Object.hasOwn(changes, key)) return null;
  return Math.max(range.min, Math.min(range.max, value + changes[key]));
}

export function assumptionsChanged(value: Assumptions, starting: Assumptions) {
  return (Object.keys(starting) as (keyof Assumptions)[]).some(
    (key) => value[key] !== starting[key],
  );
}
