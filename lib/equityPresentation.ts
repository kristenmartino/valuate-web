// Keep the calculated residual visible without presenting negative equity as a stock price.
export function equityPresentation(value: number) {
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
