# valuate-web

Frontend for [Valuate](https://valuate.kristenmartino.ai), a portfolio prototype for reviewing SEC 10-K financials and exploring company valuations. The [backend](https://github.com/kristenmartino/valuate-api) performs extraction and valuation; the [case study](https://kristenmartino.ai/work/valuate) describes the product choices and evaluation limits.


## Publication qualification

Extraction and public valuation are separate states. A saved record or an extraction score does not establish coverage. The API returns a structured `Company.qualification` report with `qualified`, `review_required` or `unsupported` status, source evidence and reasons. Both public default-assumption and valuation endpoints require a valid report for the exact saved record, annual filing and current input/model policy. Caller-supplied assumptions, cleared flags and user corrections cannot bypass the gate. Unqualified financials remain available for inspection, but the workspace withholds estimates, assumptions, projections and simulations.

Qualification requires matching annual source evidence for every model-driving input. Existing reviewed filing contracts retain precedence; other annual filings can qualify through reusable statement rules without a ticker allowlist or a new issuer-specific policy. Reports retain period dates, units, source accession, concept, accounting scope, basis and calculation operands. Generic extraction no longer substitutes total debt for noncurrent debt, depreciation alone for full D&A, restricted-plus-unrestricted cash for unrestricted cash, or noncurrent operating leases for total operating leases. Missing debt remains unknown. Debt components must be non-overlapping and use a supported carrying basis. Explicit company-specific proxies retain their labels and limitations; passing checks does not mean every displayed field was manually reviewed or that the valuation predicts a market price.

The report is bound to the complete saved record and a fingerprint of the financial pipeline, model code and filing policies. A changed record or policy invalidates it. Valuation responses identify their source record and filing; the frontend sends its record digest to reject calculations against changed financials. New filings require fresh source checks and qualification; unresolved scope still requires review. Saved, qualified older filings keep their displayed dates rather than silently claiming freshness.

Production uses PostgreSQL and refuses to start with process-local reviewer storage. Active records, immutable prior revisions, cold candidates and raw filing-evidence snapshots are stored separately. Versioned writes reject stale updates; same-filing publication preserves saved reviewer corrections. A new filing does not inherit old reviews as if they applied to its new figures. Revisions retain prior values and notes, but the shared demo credential does not identify individual reviewers.

Cold tests start with no saved record. The reviewed-contract subset of CI replays 19 ticker/share-class cases covering 18 annual filings through the real extraction graph and qualification logic using selected SEC facts, inline-XBRL fixtures and recorded AI backfill responses. All 19 reviewed cases qualify. Oracle and Amazon use source-only contracts; the other cases replay recorded AI backfill where needed. Separate missing-operand, conflicting-value, wrong-unit, wrong-period and changed-record tests must withhold valuation; a safe rejection is not scored as extraction accuracy. Separate live cold runs exercise fresh retrieval and AI extraction, stage their candidates without replacing active records, and test rejection of unqualified publication. The historical May extraction baseline remains separate and has not been rerun for these mappings.

## Broad ticker extraction

<!-- valuate:source-coverage:start -->
The reusable-rule cold set starts without saved Company records, per-issuer policies or AI responses. META, NVDA, COST, WMT, CAT, BAC, MET and O qualify. These are selected-source regressions, not a market-wide coverage rate or extraction-accuracy score. Complete-source checks are separate from the historical May extraction baseline.

Publication checks the meaning and basis of model inputs, not just whether a number occurs in a filing. Carrying debt must have complete nonoverlapping components; cash and cash-flow add-backs retain their source scope. Historical shares and direct paid-common dividends per share require consistent split bases and independent same-period bridges before conversion. Model-driving history cannot silently change units, annual dates, parent/consolidated coverage or pure/combined add-back scope. Parent equity may also come from an explicit parent column in a primary equity statement, only when the same-period parent and noncontrolling columns reconcile to the filed consolidated total and the ownership relationship is established. This recovers MET's historical parent scope without substituting inclusive equity or unrevised balances. Same-scope comparative revisions retain the newer inspected figures and are disclosed; they never authorize rescaling a different year. Older periods may not all be restated on a uniform accounting basis. Missing or ambiguous coverage requires review, and saved corrections do not bypass qualification.

A weekday SEC-only cold canary checks current filings without saved records, AI calls or publication writes. Its report distinguishes qualified, review-required and source-failed results; a failure requires maintainer review. Browser regressions exercise qualification withholding, exact assumption restoration, source-note readability, per-share units and proxy/residual labels against recorded responses with all external APIs blocked. These checks catch defined failure classes; they do not establish model suitability, investment accuracy or universal ticker coverage.
<!-- valuate:source-coverage:end -->

Enter a US ticker with a SEC 10-K. An uncached filing no longer needs to be added to an issuer allowlist before it can produce a valuation. The source-only path reads the filing-local schema, primary-statement presentation and calculation relationships, annual entity contexts and units. Standard undimensioned values also require matching SEC company-facts amounts. Optional fields with unestablished scope remain unavailable; this path makes no AI backfill or revenue-segmentation calls.

Annual history discovery follows bounded SEC submissions archive pages. The pipeline retains up to five consecutive annual periods, with at least three required, and never drops a failed year to improve coverage. It distinguishes compatible rounded repetitions from conflicting values, selects a reconciled revenue total over a sales component, and can sum explicitly presented business-group balance-sheet amounts only when the consolidated rollup reconciles.

D&A must cover every presented cash-flow component through nonoverlapping calculation paths. A PP&E-only component is insufficient. Debt must use reconciled current and noncurrent carrying amounts, including recognized finance-lease and financing components where their scope can be established. Missing debt or lease evidence is unknown, not zero. Combined cash-flow proxies retain their scope in statement, assumption and projection labels; model-implied EV/EBITDA is withheld when any historical add-back has combined coverage. The REIT model explicitly labels its cash-flow add-back for approximate FFO rather than presenting it as an income expense.

Independent qualification reconstructs the expected values from the original source documents; saved confidence, quotes and reviewer labels cannot approve a different amount. Reports identify automatic statement rules separately from reviewed filing contracts. Source URLs, periods, concepts and reconciliation operands remain inspectable. Source documents are fetched with process-wide request pacing and bounded retry/cache limits. See the SEC's [API scope](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) and [inline-XBRL explanation](https://www.sec.gov/structureddata/osd-inline-xbrl.html).

Automatic model selection also has limits: financial businesses without a supported model, insurance agencies, non-producer energy businesses, and REITs without property-ownership evidence require model review. Amendments, ambiguous contexts, missing history or incomplete input scope can still withhold a valuation. This restores broad eligible-filing support, not guaranteed coverage of every ticker or investment-model suitability.

## NVDA and BAC source coverage

[NVDA FY2026](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm) reports $0.999B current and $7.469B noncurrent carrying notes, reconciling to $8.468B in its debt note and the balance sheet. The $0.519B accumulated-amortization tag is used on a combined leasehold-improvement/finance-lease asset disclosure; it is not a lease liability or an amount to add to debt. A sole historical asset-amortization signal can proceed only with matching current/noncurrent/total debt-note values, independent SEC corroboration and complete balance-sheet rollups. No finance-lease liability is inferred as zero. An actual lease liability, principal-payment signal, new financed-asset signal, missing note operand or failed reconciliation still blocks this path.

[BAC FY2025](https://www.sec.gov/Archives/edgar/data/70858/000007085826000157/bac-20251231.htm) explicitly reports annual cash dividends paid per common share: $1.08, $1.00, $0.92, $0.86 and $0.78 for FY2025–FY2021. The DDM uses these amounts directly through the supplemental `common_dividends_per_share` field, with annual entity contexts, exact USD/share units and matching `CommonStockDividendsPerShareCashPaid` facts. It does not divide all-shareholder payments by diluted shares, substitute declared dividends, or multiply per-share payments by average shares to invent a total cash outflow. The workspace identifies the dividend-note input separately from the cash-flow statement.

Bank models retain the existing verified aggregate-payment path when no supplemental paid-common DPS is present, preserving existing saved model results. Both paths remain subject to qualification; the new field is checked on reviewed filing policies as well as reusable-rule records. Missing/incorrectly scoped evidence and changed model inputs still withhold valuation. Saved corrections and complete source notes are retained on same-filing publication.

### Comparable historical share counts

Matching each annual share count to a filing is insufficient when historical filings use different stock-split bases. The reusable path now reconciles overlapping annual diluted-share contexts before combining history. It adjusts an older figure only when one explicit SEC split ratio matches every overlapping period, with the same entity, annual dates and share units. Split disclosures may use short or instant corporate-action contexts; their filing dates must fall within the saved anchor. Neither a large year-to-year change nor a ratio guessed from two different years authorizes an adjustment. Missing, conflicting or unsupported cumulative split evidence requires review rather than silently publishing mixed bases.

NVDA's FY2023 and FY2022 diluted counts are now 25.070B and 25.350B on the ten-for-one adjusted basis, alongside 24.940B, 24.804B and 24.514B for FY2024–FY2026. The row names the split-adjusted history; calculated source details retain original counts, overlapping comparatives, the conversion factor and SEC accessions. The latest denominator and valuation are unchanged. These rules apply to newly extracted reusable-rule tickers, with forward/reverse and unsafe-evidence regressions; they do not certify every historical restatement or support guessed multi-event conversions. Existing reviewed contracts and saved corrections retain precedence.

## Reviewed debt and cash-flow coverage

The eight filings below have explicit source contracts. Amounts are USD billions; debt columns are non-overlapping carrying amounts, not face values or credit-facility capacity.

| Filing | Noncurrent debt | Current debt | Cash-flow add-back | Scope |
|---|---:|---:|---:|---|
| [ADBE FY2025](https://www.sec.gov/Archives/edgar/data/796343/000079634326000003/adbe-20251128.htm) | 6.210 | 0.000 | 0.818 | Debt includes the filed swap basis adjustment. Add-back includes accretion; it is a combined proxy, not pure D&A. |
| [CRM FY2026](https://www.sec.gov/Archives/edgar/data/1108524/000110852426000060/crm-20260131.htm) | 10.439 | 4.000 | 3.631 | Current and noncurrent debt reconcile to the 14.439 total. Existing cash-flow D&A is retained. |
| [EOG FY2025](https://www.sec.gov/Archives/edgar/data/821189/000082118926000054/eog-20251231.htm) | 7.909 | 0.027 | 4.461 | Debt already includes finance leases. The add-back includes depletion. Operating leases remain separate. |
| [PEP FY2025](https://www.sec.gov/Archives/edgar/data/77476/000007747626000007/pep-20251227.htm) | 42.321 | 6.861 | 3.451 | Current debt includes current notes and other borrowings. Historical add-backs follow the cash-flow total. |
| [TXN FY2025](https://www.sec.gov/Archives/edgar/data/97476/000009747626000059/txn-20251231.htm) | 13.548 | 0.500 | 1.999 | Notes reconcile to 14.048; explicitly filed commercial paper is zero. Add-back sums depreciation and software amortization. |
| [SBUX FY2025](https://www.sec.gov/Archives/edgar/data/829224/000082922425000114/sbux-20250928.htm) | 14.5759 | 1.4989 | 1.7715 | Notes reconcile to 16.0748; cash-flow D&A differs from the 1.6847 income expense line. |
| [ORCL FY2026](https://www.sec.gov/Archives/edgar/data/1341439/000119312526277521/orcl-20260531.htm) | 129.423 | 7.819 | 9.294 | Notes and borrowings plus separately recognized finance leases; D&A sums the two cash-flow components. |
| [AMZN FY2025](https://www.sec.gov/Archives/edgar/data/1018724/000101872426000004/amzn-20251231.htm) | 84.190 | 5.105 | 65.756 | Carrying notes, short-term borrowings, finance leases and recognized financing obligations; the add-back includes content, lease assets and other adjustments. |

Adobe's `LongTermDebt` concept labels the balance-sheet noncurrent carrying amount in this filing; it is not treated as an inclusive total. Its zero current debt is an explicit filed amount. Statement rows, assumptions and projections label **D&A + accretion**, and the DCF-implied EV/EBITDA multiple is unavailable for that combined proxy. These disclosures retain the existing add-back values and valuation formula.

PepsiCo's older `DepreciationAndAmortization` note amounts exclude separately reported intangible amortization, while the cash-flow total includes it. The existing cash-flow series of 3.451, 3.160, 2.948, 2.763 and 2.710 is retained with that scope. The generic ambiguity rule remains in place for other filers.

TXN's complete five-year cash-flow add-back series is 1.999, 1.580, 1.238, 0.979 and 0.954. The 2021 amount includes 0.142 of acquisition-related intangible amortization as well as 0.755 depreciation and 0.057 software amortization. Required components come from one common annual filing per period, bounded by the reviewed anchor; absent components cannot be guessed or supplied by AI. The capex/revenue starting ratio and exact restore behavior are unchanged.

SBUX's reviewed window is FY2021–FY2025. Its cash series is 3.2198, 3.2862, 3.5515, 2.8184 and 6.4557; the four recent balance sheets explicitly label those amounts cash and cash equivalents despite using a broader taxonomy concept. A generic restricted-cash fallback remains prohibited. Statement-role selection cross-checks the row label, entity, annual context, units, accession and company-facts amount. Cash-flow D&A is 1.7715, 1.5924, 1.4503, 1.5294 and 1.5241; the separate operating-expense series is 1.6847, 1.5126, 1.3626, 1.4479 and 1.4417. Current plus noncurrent notes must reconcile across all five years. Historical current debt includes separate short-term borrowings: $0.175B of commercial paper in FY2022 and $0.0335B from Japanese facilities in FY2023. Current debt totals are 1.4989, 1.2489, 1.8521, 1.9240 and 0.9989 across the five years. A notes-only reconciliation would miss those borrowings. The latest filing reports no commercial-paper or facility borrowings; the zero is established by explicit dated filing statements, not missing tags, and capacity is not debt. Restoring missing years changes the historical starting ratios. GAAP operating income still includes restructuring and impairment costs; the model does not normalize them. Non-model optional fields are not certified by this repair.

Oracle and Amazon use reviewed, source-only onboarding contracts: neither extraction calls AI backfill or AI revenue segmentation. Exact annual contexts, statement rows and allowed dimensions are checked against two pinned accessions per company; standard undimensioned facts also require matching company-facts amounts. Missing operands or failed reconciliations cannot be replaced with estimates. Both contracts require five years of model-driving income, tax and cash-flow inputs. Older debt cells remain unknown when all recognized components cannot be established; they are not used as zeros or in historical debt averages.

Oracle's FY2026 cash-flow D&A is 7.623 depreciation plus 1.671 intangible amortization. Current/noncurrent notes and other borrowings of 7.199/122.342 reconcile to 129.541 and already include 1.468 commercial paper. Separate finance leases of 0.620/7.081 bring the modeled debt slots to 7.819/129.423. Operating leases of 30.190 remain separate in the net-debt bridge; cash is 31.289. Consolidated pre-tax income comes from Oracle's exact inline custom total, not a domestic or foreign subtotal. The five-year D&A series is 9.294, 6.174, 6.139, 6.108 and 3.122. The starting DCF produces a **negative equity residual**, displayed as an unfloored model residual per share with no DCF-implied trading multiples. It is not a negative stock-price estimate. The simple historical-input model does not value cloud backlog or separately project 260 billion of disclosed uncommenced lease commitments.

Amazon's 68.836 face-value notes less 0.440 discounts/issuance costs reconcile to 68.396 carrying notes, split 2.748 current and 65.648 noncurrent. The slots also include 0.455 separate short-term borrowings, 1.544/10.742 finance leases and 0.358/7.800 recognized financing obligations. The 7.800 amount is reported rounded to 0.1 billion. Recognized financing obligations are distinct from future gross payments including interest. Operating leases of 89.252 remain separate; cash of 86.810 excludes restricted cash and marketable securities. The discount requires the exact senior-notes dimension; financing obligations require the reviewed custom inline concepts and consolidated contexts.

Amazon's cash-flow add-back covers depreciation/amortization of property, equipment and capitalized content costs, operating-lease assets, and other adjustments. Its 65.756, 52.795, 48.663, 41.921 and 34.433 series is a **combined model proxy, not pure D&A**. Statements, assumptions and projections retain that scope, and DCF-implied EV/EBITDA is unavailable. Neither filing's cash-flow aggregate is copied into an income-expense row. Both DCFs use gross cash PP&E capex, omit separate noncash additions/future commitments and retain GAAP operating effects; they do not reproduce company-reported free cash flow or forecast spending plans. Qualification establishes the reviewed input scope, not predictive accuracy or a positive equity result.

A reusable statement reader and declarative filing contracts protect these inputs from AI replacement. Reviewed policies set the required history window; missing years cannot be silently dropped. The backend's `python -m eval.preflight --tickers SBUX --output preflight.json` checks SEC source completeness without AI calls, estimates, repository writes or publication. Run it on proposed tickers during onboarding, resolve missing or ambiguous scope, pin a cold regression fixture, then require independent qualification before publishing. Source completeness is a checklist, not approval; new or unreviewed filings can still be withheld.

Repairs under the existing six-filing repair contracts require complete matching evidence across the existing annual history before changing any amount. They preserve reviewer values and full notes, never split a reviewer-held debt pair automatically, and publish only after the independent qualification gate passes. Missing or conflicting evidence leaves the saved record unchanged. New filings still require fresh source checks and qualification; these checks do not certify unrelated fields or expand the historical May extraction-accuracy baseline.


## Workspace

The home page offers 18 sample companies across five model categories and a ticker search. Search requires a SEC 10-K; extraction may fail on missing required fields. The default FCFF model is not suitable for every company outside the explicitly modeled categories.

Dot and hyphen share-class symbols use one canonical route: `BRK.B`, `brk.b`, and `BRK-B` resolve to `/v/BRK-B`. Direct legacy dot URLs redirect as well. Berkshire now uses filing-tagged annual average equivalent shares for the requested class, with dimensioned premiums and cash. A qualified workspace displays a simplified justified-P/B estimate using consolidated GAAP earnings and Berkshire shareholders' equity. This is not a sum-of-the-parts valuation; investment gains can distort ROE, and annual average shares differ from year-end shares. The share-count row and source details identify the equivalent Class A or B basis. Ticker recognition remains separate from valuation coverage: required missing data still produces an explicit unavailable state.

For a qualified filing, `/v/[ticker]` shows:

- Company, filing period, model category, and automated review status.
- Estimated value and assumptions first, side by side on larger screens.
- Data-review flags and correction controls, then a revenue breakdown, peer multiples, simulations, projections, and extracted statements.
- Source details that open by click or keyboard: stored XBRL tags, AI-provided excerpts, calculation descriptions, or current correction notes.

Diluted shares use share units rather than currency. Missing values are shown as dashes, not zero. Source labels describe origin, not verification. Internal XBRL scores are tag-priority heuristics; AI scores are self-reported, not calibrated accuracy probabilities. Automated checks flag scores below 0.80 and balance-sheet discrepancies above 0.5%. No flags does not mean every value has been verified.

The displayed simulation interval is the middle 80% of outputs under sampled assumptions, not a confidence interval for future stock prices. No quoted market price is inferred from market capitalization divided by filing diluted shares.

Corrections replace the current saved value and rerun extraction validation. The changed record requires fresh qualification before another public valuation; the UI clears the estimate when qualification is lost. The backend retains previous revisions and correction notes without individual reviewer identity. Ordinary scenario-update failures retain an explicit previous-result notice; a failed qualification or record-version check clears the result.

Assumption sliders expand their ranges to include the current and starting values. They retain full API precision, including defaults between the usual keyboard increments. **Restore starting assumptions** returns all inputs to the exact values loaded when the workspace opened and recalculates the scenario; it does not round-trip the displayed percentages or change saved financials. For example, TXN's starting capex/revenue ratio of `0.22576254758204173` (displayed 22.58%) remains selectable above the usual 20% ceiling. Keyboard arrows retain each control's configured increment; Home and End select the displayed bounds.

Starting assumptions combine historical calculations and model defaults. For standard DCF, eligible periods have positive revenue; tax expense / positive pre-tax income is limited to 0–50% per period, averaged, then limited to 15–30%. The tax fallback is 21%. IBM therefore starts at 15% despite its FY2025 filed effective rate of −2.3%; this is a normalized projection assumption, not a replacement for the filed tax benefit. Energy averages the same per-period bounded rates without the additional 15–30% normalization. Standard and energy working capital starts at a fixed 5% of the change in revenue, not a ratio calculated from historical working-capital balances.

Capex/revenue and cash-flow add-back/revenue start at equal-weight averages of available annual ratios with positive revenue. Missing-ratio fallbacks are 4% for standard DCF and 20% for energy, and coverage follows the extracted cash-flow fields. Bank, insurer and REIT tax figures are read-only model context: an average of available tax/pre-tax ratios limited to 0–50% per period, or 21% if unavailable; these tax figures do not drive those models. The workspace labels the cash-flow assumptions and explains these starting rules beside the controls. Editing a scenario or restoring its starting assumptions does not change saved financial figures or review notes.

## Model categories

| Category | Model | Controls and output |
|---|---|---|
| Industrial / tech | Five-year FCFF DCF | Growth, margin, WACC, terminal growth, cash-flow assumptions; projection and sensitivity grid |
| Bank | Dividend discount | Cost of equity and dividend growth |
| Insurer | Justified price-to-book | ROE, cost of equity, long-term growth |
| REIT | FFO Gordon growth | Cost of equity and FFO growth; AFFO cross-check |
| Energy | Ten-year FCFF, no terminal value | Revenue growth, margin, WACC, cash-flow assumptions; projection, sensitivity, standardized-measure cross-check |

## Implementation

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, and Recharts. The server components provide page shells; `Workspace.tsx` owns extraction, assumptions, valuation, and correction state. Valuation requests are debounced by 300 ms and guarded against stale responses. `lib/api.ts` mirrors the backend's statement variants and provides display formatters. `SourceDetails.tsx` provides the expandable provenance display. On screens narrower than 640px, statement-cell source details open in a viewport-sized dialog with wrapping text and vertical scrolling. Close or Escape dismisses it and returns focus to the source control. Larger screens retain inline disclosures.

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

## Apple debt coverage

AAPL uses filed noncurrent term debt separately from short-term debt, which already includes current term maturities and commercial paper. The FY2025 noncurrent amount is $78.328B; using the inclusive $90.678B total in that slot would count the $12.350B current portion twice. The backend repairs known inclusive machine fields across the saved history while preserving other amounts and reviewer corrections. Failed repairs retain the saved figures and a debt-coverage warning.

The corrected debt feeds the net-debt bridge and the default WACC calculation. With the saved FY2025 inputs, WACC remains at its existing 7% floor and the other starting assumptions are unchanged. This targeted selection does not certify every financial field or expand the historical extraction baseline.

## IBM operating-input coverage

IBM's standard operating-income tag is unavailable, and its income statement is incorporated in a separate annual-report exhibit. The backend calculates an **EBIT proxy** from filed GAAP pre-tax income from continuing operations plus separately reported interest ($12.263B for FY2025). This retains other income/expense and financing interest already in cost of revenue; it is not reported operating income or IBM's operating (non-GAAP) earnings.

The company note, headline figure, statement row, assumption ratio, sensitivity axis and projection column identify the proxy. The API still uses `operating_income` / `operating_margin` wire keys; `operating_income_label` provides its display scope. The derived field remains flagged for review, and an available valuation does not mean it has been manually approved. The DCF-implied EV/EBITDA multiple is unavailable for this proxy, while provider market multiples retain their own definitions. Missing or conflicting tagged operands still prevent composition; other companies' labels, calculations and saved corrections remain unchanged.

IBM also selects matching annual noncurrent debt and current borrowings ($54.836B + $6.424B for FY2025) and calculates the cash-flow D&A total from the separately filed depreciation and amortization adjustments ($2.284B + $2.737B = $5.021B). Both D&A statement slots use that total across the supported annual history. Missing latest D&A components or either debt component prevent valuation; they are not replaced by a partial amount or zero. Existing corrections for other companies are unaffected. The generic capex input still covers PP&E only, excluding separately reported investment in software; IBM's model note discloses this remaining simplification.

## Intuit input coverage

INTU's D&A input sums filed depreciation and the full cash-flow amortization adjustment, rather than depreciation alone or the narrower other-intangibles expense. FY2026: $187M + $659M = $846M. The five-year total series is $846M, $809M, $789M, $806M and $746M. Both statement slots identify the calculated total through source details. Noncurrent debt is $6.420B, separate from the $1.249B current maturities; the inclusive $7.669B amount is not added to current debt again.

The INTU-only selection requires matching annual USD facts from one filing, with the latest period tied to its selected 10-K and older periods bounded by that filing's date. It uses `AdjustmentForAmortization`, which includes acquired technology and other acquired intangibles; `AmortizationOfIntangibleAssets` alone covers only the other-intangibles expense component. Missing, conflicting or unsafe components cannot be replaced with AI guesses. Saved repair is atomic across affected history and preserves reviewer overrides and other correct fields. If repair cannot establish complete coverage, the record retains its amounts and a warning, and valuation/default requests remain unavailable until the inputs are recovered.

With the captured FY2026 inputs, net debt is $3.716B, default WACC is about 7.86%, and the D&A/revenue ratio is about 4.91%. Other assumptions and the existing corrections for other companies are unchanged. The company note discloses the remaining PP&E-only capex input, which excludes separately reported capitalized internal-use software. This targeted repair does not manually approve INTU's unrelated gross-profit field or expand the historical extraction evaluation.

## Microsoft input coverage

MSFT uses pure D&A expense from two non-overlapping filed disclosures: depreciation plus intangible-asset amortization. FY2026 is $34.3B + $4.7B = $39.0B; the five-year series is $39.0B, $28.0B, $20.0B, $13.5B and $14.6B. The $38.534B cash-flow row includes other adjustments and is not substituted for pure D&A. Both statement slots label the sum as calculated and expose the operands, annual dates and source accession; the company note explains the scope.

Current maturities of $9.227B and noncurrent debt of $31.067B must reconcile to the filed $40.294B total. The saved MSFT record previously held that total in the long-term slot with current debt blank. Repairing both slots together preserves aggregate debt, net debt and default WACC; adding current debt beside the inclusive total would double-count it. The corrected five-year D&A/revenue average changes that assumption and the valuation, while other starting assumptions stay unchanged.

The MSFT-only selector requires annual USD expense facts and year-end debt instants from one common annual filing for each period, with the latest tied to the selected 10-K and older periods bounded by its filing date. Missing, conflicting, nonfinite, negative, differently scoped or incoherent debt facts cannot be replaced by AI guesses. Saved repair requires every affected historical period before changing any, preserves user corrections and other fields, and does not split a reviewer-held debt pair automatically. Unresolved coverage keeps the saved record and an explicit flag while valuation/default requests fail. These targeted checks do not approve other MSFT fields or expand the historical extraction baseline.

## Alphabet debt basis and depreciation scope

GOOGL's FY2025 debt uses carrying amounts: $49.085B face value less $0.542B discounts/issuance costs equals $48.543B, split into $1.996B current maturities and $46.547B noncurrent debt. Current debt also includes filed commercial paper ($0 in FY2025; $2.300B in FY2024). Matching annual USD facts from one filing must reconcile before use. FY2022's legacy debt table includes finance leases, unlike the later notes-only figures; statement cells and source details disclose the different historical coverage. The existing net-debt bridge separately adds reported operating-lease liabilities.

The $21.136B FY2025 add-back is **property-and-equipment depreciation**, used as a proxy, not verified full D&A. Its historical values and revenue ratio remain unchanged; no unverified amortization is added. Statement rows, the assumption control, projection and model note disclose that scope. DCF-implied EV/EBITDA is unavailable on this basis; provider market multiples retain their own definitions.

Scoped extraction protects these inputs from AI backfill. Saved repair requires matching facts for every saved period before changing any, preserves reviewer overrides and other fields, and never automatically splits a reviewed debt pair. Unresolved debt coverage retains the record and warning while valuation/default requests fail. These targeted checks do not approve other fields or expand the historical extraction baseline. See the [FY2025 filing](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm) and [FY2023 filing with the legacy comparison](https://www.sec.gov/Archives/edgar/data/1652044/000165204424000022/goog-20231231.htm).
