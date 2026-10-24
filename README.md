# valuate-web

Frontend for [Valuate](https://valuate.kristenmartino.ai), a portfolio prototype for reviewing SEC 10-K financials and exploring company valuations. The [backend](https://github.com/kristenmartino/valuate-api) performs extraction and valuation; the [case study](https://kristenmartino.ai/work/valuate) describes the product choices and evaluation limits.

## Workspace

The home page offers 18 sample companies across five model categories and a ticker search. Search requires a SEC 10-K; extraction may fail on missing required fields. The default FCFF model is not suitable for every company outside the explicitly modeled categories.

Dot and hyphen share-class symbols use one canonical route: `BRK.B`, `brk.b`, and `BRK-B` resolve to `/v/BRK-B`. Direct legacy dot URLs redirect as well. Ticker recognition is separate from valuation coverage: Berkshire currently lacks required extracted financial values, so the workspace reports “Ticker recognized; valuation unavailable” instead of inventing a per-share estimate.

At `/v/[ticker]`, the workspace shows:

- Company, filing period, model category, and automated review status.
- Estimated value and assumptions first, side by side on larger screens.
- Data-review flags and correction controls, then segment revenue, peer multiples, simulations, projections, and extracted statements.
- Source details that open by click or keyboard: stored XBRL tags, AI-provided excerpts, calculation descriptions, or current correction notes.

Diluted shares use share units rather than currency. Missing values are shown as dashes, not zero. Source labels describe origin, not verification. Internal XBRL scores are tag-priority heuristics; AI scores are self-reported, not calibrated accuracy probabilities. Automated checks flag scores below 0.80 and balance-sheet discrepancies above 0.5%. No flags does not mean every value has been verified.

The displayed simulation interval is the middle 80% of outputs under sampled assumptions, not a confidence interval for future stock prices. No quoted market price is inferred from market capitalization divided by filing diluted shares.

Corrections replace the current saved value and rerun validation and valuation. Reviewer identity and prior corrections are not stored. A failed valuation update leaves the last successful output visible with an explicit stale-results notice and retry action.

## Model categories

| Category | Model | Controls and output |
|---|---|---|
| Industrial / tech | Five-year FCFF DCF | Growth, margin, WACC, terminal growth, historical ratios; projection and sensitivity grid |
| Bank | Dividend discount | Cost of equity and dividend growth |
| Insurer | Justified price-to-book | ROE, cost of equity, long-term growth |
| REIT | FFO Gordon growth | Cost of equity and FFO growth; AFFO cross-check |
| Energy | Ten-year FCFF, no terminal value | Revenue growth, margin, WACC, historical ratios; projection, sensitivity, standardized-measure cross-check |

## Implementation

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, and Recharts. The server components provide page shells; `Workspace.tsx` owns extraction, assumptions, valuation, and correction state. Valuation requests are debounced by 300 ms and guarded against stale responses. `lib/api.ts` mirrors the backend's statement variants and provides display formatters. `SourceDetails.tsx` provides the expandable provenance display.

`next.config.ts` rewrites `/api/*` to `NEXT_PUBLIC_VALUATE_API`. The server-side `proxy.ts` injects `VALUATE_OVERRIDE_TOKEN` for correction requests so that the bearer token is not exposed to the browser.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_VALUATE_API` to the backend origin, or `http://127.0.0.1:8000` for a local backend. Set the server-only `VALUATE_OVERRIDE_TOKEN` to the matching backend token when corrections require authentication. It must not use a `NEXT_PUBLIC_` prefix.

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The frontend is deployed on Vercel. See `.env.example` for configuration; backend persistence and extraction freshness are configured separately in the API service.

## Model-specific presentation

Bank, insurer, and REIT models estimate equity directly, so the workspace displays equity value without the API's placeholder enterprise-value or net-debt fields. Historical context for these models is read-only; only the formula's inputs are editable.

The REIT screen labels net income plus D&A as approximate FFO and the supplementary metric as estimated AFFO. Expand each calculation to see the formula. Estimated AFFO subtracts positive reported capital expenditures; otherwise it uses 80% of approximate FFO. These are simplified model calculations, not company-reported FFO/AFFO.

Energy uses a fixed ten-year revenue-based cash-flow projection without terminal value. It does not estimate reserve life, production volumes, or commodity prices. The revenue-growth input and sensitivity axes describe the calculation actually performed.

## Balance-sheet corrections

A reconciliation flag identifies the whole balance sheet. Its editor requires a choice of total assets, total liabilities, or shareholders' equity before a number can be saved. Each choice loads that field's current value and supporting excerpt; the request uses the specific `balance_sheet.<field>` path required by the API. Saving reruns validation, so a reconciliation warning can remain when another line still needs review.

Run `npm test` for correction-target and request-validation regression tests.

## Valuation inputs and simulation display

The workspace checks that the discount rate exceeds growth for perpetuity models, and that ROE exceeds growth for the insurer model. Invalid combinations show an input-specific explanation and keep prior results explicitly labeled until valid inputs recalculate.

The API preserves the full Monte Carlo histogram and supplies a second histogram built from actual samples between p10 and p90, with counts below and above that window. The chart defaults to that percentile view, discloses its sample counts, and offers a full-range view. All summary statistics use all completed samples. Older API responses without the additional histogram display the full range.

Trading-comps copy distinguishes market context from the DCF-implied row, which is available for standard and energy models.
