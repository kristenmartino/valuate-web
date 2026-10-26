# valuate-web

Frontend for [Valuate](https://valuate.kristenmartino.ai), a portfolio prototype for reviewing SEC 10-K financials and exploring company valuations. The [backend](https://github.com/kristenmartino/valuate-api) performs extraction and valuation; the [case study](https://kristenmartino.ai/work/valuate) describes the product choices and evaluation limits.

## Workspace

The home page offers 18 sample companies across five model categories and a ticker search. Search requires a SEC 10-K; extraction may fail on missing required fields. The default FCFF model is not suitable for every company outside the explicitly modeled categories.

Dot and hyphen share-class symbols use one canonical route: `BRK.B`, `brk.b`, and `BRK-B` resolve to `/v/BRK-B`. Direct legacy dot URLs redirect as well. Berkshire now uses filing-tagged annual average equivalent shares for the requested class, with dimensioned premiums and cash. Its workspace displays a simplified justified-P/B estimate using consolidated GAAP earnings and Berkshire shareholders' equity. This is not a sum-of-the-parts valuation; investment gains can distort ROE, and annual average shares differ from year-end shares. The share-count row and source details identify the equivalent Class A or B basis. Ticker recognition remains separate from valuation coverage: required missing data still produces an explicit unavailable state.

At `/v/[ticker]`, the workspace shows:

- Company, filing period, model category, and automated review status.
- Estimated value and assumptions first, side by side on larger screens.
- Data-review flags and correction controls, then a revenue breakdown, peer multiples, simulations, projections, and extracted statements.
- Source details that open by click or keyboard: stored XBRL tags, AI-provided excerpts, calculation descriptions, or current correction notes.

Diluted shares use share units rather than currency. Missing values are shown as dashes, not zero. Source labels describe origin, not verification. Internal XBRL scores are tag-priority heuristics; AI scores are self-reported, not calibrated accuracy probabilities. Automated checks flag scores below 0.80 and balance-sheet discrepancies above 0.5%. No flags does not mean every value has been verified.

The displayed simulation interval is the middle 80% of outputs under sampled assumptions, not a confidence interval for future stock prices. No quoted market price is inferred from market capitalization divided by filing diluted shares.

Corrections replace the current saved value and rerun validation and valuation. Reviewer identity and prior corrections are not stored. A failed valuation update leaves the last successful output visible with an explicit stale-results notice and retry action.

Assumption sliders expand their ranges to include the current and starting values. They retain full API precision, including defaults between the usual keyboard increments. **Restore starting assumptions** returns all inputs to the exact values loaded when the workspace opened and recalculates the scenario; it does not round-trip the displayed percentages or change saved financials. For example, TXN's starting capex/revenue ratio of `0.22576254758204173` (displayed 22.58%) remains selectable above the usual 20% ceiling. Keyboard arrows retain each control's configured increment; Home and End select the displayed bounds.

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

## Statement coverage

Insurer investment and policy-liability slots can hold either totals or components. Labels follow each period's stored XBRL concept: Berkshire's debt-security figure is labeled fixed-maturity securities (available for sale), and its future-policy-benefit figure does not claim to include unpaid claims. Different concepts across years get separate coverage labels beside the values. Unknown, AI-extracted, calculated, or corrected amounts without a recognized XBRL basis are labeled with unspecified coverage rather than presented as totals.

Berkshire's cash calculation retains Treasury bills already classified as cash equivalents and excludes separately reported restricted cash and short-term Treasury-bill investments. These disclosure changes do not alter values, valuation formulas, or assumptions.

## Balance-sheet corrections

A reconciliation flag identifies the whole balance sheet. Its editor requires a specific field choice before a number can be saved: total assets, total liabilities, shareholders' equity, or noncontrolling interests when that component is available. Each choice loads that field's current value and supporting excerpt; the request uses the specific `balance_sheet.<field>` path required by the API. Saving reruns validation, so a reconciliation warning can remain when another line still needs review.

Run `npm test` for correction-target and request-validation regression tests.

## Valuation inputs and simulation display

The workspace checks that the discount rate exceeds growth for perpetuity models, and that ROE exceeds growth for the insurer model. Invalid combinations show an input-specific explanation and keep prior results explicitly labeled until valid inputs recalculate.

The API preserves the full Monte Carlo histogram and supplies a second histogram built from actual samples between p10 and p90, with counts below and above that window. The chart defaults to that percentile view, discloses its sample counts, and offers a full-range view. All summary statistics use all completed samples. Older API responses without the additional histogram display the full range.

Trading-comps copy distinguishes market context from the DCF-implied row, which is available for standard and energy models.

The trading-comps median uses only returned peers with a positive, finite multiple in each column; the target and DCF-implied row are excluded. The panel labels this inclusion rule and shows its contributing count per metric, including zero available peers. Negative and zero multiples remain visible in individual rows. Missing or nonfinite multiples render as a dash without an `x` suffix. Market data is requested when the workspace loads, but the panel does not expose provider as-of timestamps or establish quote/input freshness.

The balance-sheet table shows parent versus consolidated equity coverage from recognized source concepts and displays noncontrolling interests separately. Reconciliation adds that component to parent equity and avoids counting it twice for a consolidated-equity tag. A saved Prologis record can acquire the missing component from the same filing without changing existing amounts or valuation inputs; this does not establish filing freshness. Unknown equity coverage remains explicitly labeled.

## Salesforce coverage repair

CRM shows noncurrent debt separately from current debt and uses the filed cash-flow D&A total across its saved history. Those inputs affect default WACC, the D&A/revenue assumption, and the valuation. Its payables row is labeled accounts payable, accrued expenses and other liabilities when that combined XBRL concept is present. Other unknown payables coverage is labeled unspecified, with per-period labels when coverage differs. The backend's targeted repair preserves existing user corrections, including the reviewed SG&A note; this does not establish that every other field has been manually verified.

CRM's revenue breakdown displays five subscription/support service offerings and professional services and other, with full category names and tagged filing source details. The six categories must reconcile to consolidated revenue; the subscription subtotal is excluded from the bars to avoid double-counting. The panel identifies these as revenue categories because Salesforce reports one operating segment. This presentation does not change the consolidated valuation model.

## Cisco debt coverage

CSCO uses filed noncurrent debt separately from short-term debt, which already includes current maturities. The backend repairs older machine-extracted inclusive debt values across the saved history while preserving reviewed corrections, including the complete SG&A note. The corrected latest debt feeds both net debt and default WACC. Missing or conflicting source facts retain the saved values and a coverage warning; this targeted repair does not establish that every financial field has been verified.

### Cisco cash-flow add-back

CSCO uses its tagged annual depreciation, amortization and other cash-flow adjustment as a combined model proxy. The FY2026 amount is $2.540B; the generic $0.700B fact covers property and equipment only. Statement rows say **Depreciation, amortization and other**, the ratio says **D&A + other / revenue**, and the projection column says **D&A + other**. A note explains that the add-back is not pure D&A and its historical ratio is projected against revenue.

The DCF-implied EV/EBITDA multiple is unavailable for this combined adjustment, with an explanation in the comps panel. Operating income plus this proxy is not presented as pure EBITDA; provider market multiples retain their own definitions.

The backend replaces incomplete machine-extracted D&A fields across the saved history only after all affected annual periods have matching filing facts. The repair preserves corrected debt, reviewed SG&A and other saved fields. Its combined adjustment/revenue average changes the default D&A ratio and valuation; WACC and other assumptions are unchanged. Missing tagged latest-period data fails explicitly on new extraction, and failed saved-record repair retains the prior values and warning. These targeted checks do not expand the historical extraction baseline.
