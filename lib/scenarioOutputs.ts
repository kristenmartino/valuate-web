import type { MonteCarloResult, SensitivityGrid } from './api';

type OutputBasis = 'parent_equity_proxy' | undefined;
export const isNegativeOutput = (value: number | null) => value !== null && Number.isFinite(value) && value < 0;

export function hasNegativeSensitivity(grid: SensitivityGrid) {
  return grid.values.some(row => row.some(isNegativeOutput));
}

export function hasNegativeSimulations(result: MonteCarloResult) {
  // Always inspect the full histogram, even when the visible percentile window
  // is positive. Empty bins do not establish a negative simulated output.
  return result.histogram.some(([edge, count]) => count > 0 && isNegativeOutput(edge))
    || [result.mean, result.median, result.p10, result.p25, result.p75, result.p90].some(isNegativeOutput);
}

export function scenarioOutputPresentation(hasNegative: boolean, basis?: OutputBasis) {
  const parent = basis === 'parent_equity_proxy';
  return {
    hasNegative,
    perShareLabel: parent ? 'Parent-equity proxy outputs per share'
      : hasNegative ? 'Model equity outputs per share' : 'Estimated value per share',
    rangeLabel: parent ? 'parent-equity proxy outputs'
      : hasNegative ? 'simulated model equity outputs' : 'simulated valuations',
    residualLabel: parent ? 'unfloored parent-equity proxy residual' : 'unfloored model equity residual',
    caveat: !hasNegative ? null : parent
      ? 'Negative outputs are unfloored parent-equity proxy residuals, not negative common-stock prices. Preferred claims remain included; common-share valuation is unverified.'
      : 'Negative outputs are unfloored model equity residuals, not negative stock-price estimates. Signed calculations are retained; they are not floored to zero.',
  };
}
