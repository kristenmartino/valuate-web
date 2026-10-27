// Keep the calculated residual visible without presenting negative equity as a stock price.
export function equityPresentation(value: number, basis?: 'parent_equity_proxy') {
  if (basis === 'parent_equity_proxy') {
    return {
      title: 'Parent-equity proxy per share',
      caveat: 'A parent-equity model illustration, not a verified common-stock price estimate. Parent equity and earnings include preferred claims where present; preferred capital and distributions are not deducted. The denominator uses the annual diluted or equivalent shares shown in the statements.',
      rangeLabel: 'parent-equity proxy outputs',
      showImpliedMultiples: false,
    };
  }
  return value <= 0
    ? {
        title: "Model equity residual per share",
        caveat: "The scenario produces no positive equity value after net debt. This is an unfloored model residual, not a stock-price estimate.",
        rangeLabel: "simulated equity residuals",
        showImpliedMultiples: false,
      }
    : {
        title: "Estimated value per share",
        caveat: "An estimate under the selected assumptions, not a quoted stock price.",
        rangeLabel: "simulated valuations",
        showImpliedMultiples: true,
      };
}
