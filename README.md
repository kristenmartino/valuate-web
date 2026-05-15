# valuate-web

> Frontend for **Valuate** — AI-augmented DCF agent over SEC 10-K filings.
> Live at [valuate.kristenmartino.ai](https://valuate.kristenmartino.ai)
> · Backend repo: [valuate-api](https://github.com/kristenmartino/valuate-api)
> · Case study: [kristenmartino.ai/work/valuate](https://kristenmartino.ai/work/valuate)

The case study has the full design narrative; this README is a working reference for the code.

## What this is

A Next.js 16 (App Router) frontend paired with the valuate-api FastAPI service. The home page surfaces 14 curated tickers across five industries plus a free-text search for any SEC-filed company. Each ticker routes to a workspace at `/v/[ticker]` that runs the agent extraction, lets the user adjust assumption sliders, and renders Monte Carlo + sensitivity visualizations alongside the per-share fair value.

## Routes

```
/                         home page — curated 14-ticker grid + free-text ticker search
/v/[ticker]               workspace — extraction review, statements, sliders, MC + sensitivity, comps
```

## Architecture

Server-rendered shells, client-rendered interactive surfaces:

- **Server Components** — `app/page.tsx` (curated ticker grid), `app/v/[ticker]/page.tsx` (workspace shell). The workspace route awaits `params` per Next 16's async params convention.
- **Client Components** — everything under `components/`:
  - `Workspace.tsx` — state machine for extract → defaults → value → optional override loop. Owns `Company`, `Assumptions`, `ValuationResponse`, `CompsResponse` state; debounces re-valuation 300ms after slider changes.
  - `AssumptionsPanel.tsx` — industry-aware sliders. Standard mode = 4 MC drivers + 4 historical ratios; bank/insurer/REIT modes relabel sliders for the relevant formula (cost of equity, dividend growth, ROE, etc.) and hide unused ones; energy mode relabels `revenue_growth` as "Production growth/decline" and notes the no-terminal design in the help text.
  - `StatementsPanel.tsx` — three-statement view, side-by-side across the 3 most-recent fiscal years, with a per-industry field-map so the table shows the right line items per variant. Each cell renders its `source` + `confidence`; hover for the verbatim quote or XBRL tag.
  - `MonteCarloChart.tsx`, `SensitivityHeatmap.tsx` — Recharts visualizations.
  - `CompsPanel.tsx`, `SegmentsPanel.tsx`, `FlagsPanel.tsx` — peer-multiples table, revenue-by-segment breakdown, and HITL flag/override surface respectively.
  - `TickerSearch.tsx` — escape hatch from the curated grid. Validates `1–5` letters (optional `.` or `-` class suffix) and routes via `useRouter`.
  - `LoadingStepper.tsx` — replaces the bare spinner during the ~15s first-extract with a 4-step progress checklist (cache → extract → defaults → value). Active step gets a spinner, completed get a green check.
  - `RecentlyViewed.tsx` — chip row above the curated grid that hydrates from `localStorage` (`lib/recentlyViewed.ts`), surfaces the last 6 distinct tickers the user has visited.
- **Helpers** (`lib/`): `friendlyError.ts` parses raw fetch errors into title + actionable hint (ticker-not-found, rate-limited, composition-error, etc.); `recentlyViewed.ts` is the localStorage shim for the chip row.
- **API client** — `lib/api.ts`. TypeScript discriminated unions (`AnyIncomeStatement = IncomeStatement | BankIncomeStatement | InsuranceIncomeStatement | REITIncomeStatement`) mirror the Pydantic schemas one-to-one, so `kind` narrowing on the frontend uses the same discriminator the backend serializes with.

Next.js rewrites in `next.config.ts` proxy `/api/*` → `${NEXT_PUBLIC_VALUATE_API}/*` so the browser only sees the Vercel origin (no CORS plumbing). A `proxy.ts` (Next 16's renamed middleware file) sits in front of override requests specifically: it injects `Authorization: Bearer ${VALUATE_OVERRIDE_TOKEN}` from a non-public Vercel env var, so the token never reaches the browser but the backend still sees the credential it requires. When the env var is unset, the proxy is a no-op and the backend's auth dependency also short-circuits — local dev works without setup.

## Industry-aware rendering

Workspace components dispatch on `period.industry` (a string union from the API response):

| Surface | Standard | Bank | Insurer | REIT | Energy |
|---|---|---|---|---|---|
| Summary stat cards | Revenue · Op income · Net income · Total assets | NII · IBT · Net income · Total assets | Premiums · Investment income · Net income · Total assets | Revenue · Net income · D&A · Real estate (net) | Revenue · Op income · Net income · Total assets |
| Slider labels | Revenue growth · Op margin · WACC · Terminal growth | Cost of equity · Dividend growth | ROE · Cost of equity · Long-term growth | Cost of equity · FFO growth | Production growth/decline · Op margin · WACC |
| Sensitivity grid | shown | hidden | hidden | hidden | shown |
| Projection table | 5-year FCFF | hidden (DDM has no annual projection) | hidden | hidden | 10-year FCFF, terminal `$0` |
| Statements field map | standard us-gaap | bank-specific (net interest income, loans, deposits) | insurer-specific (premiums, reserves) | REIT-specific (real-estate-at-cost / accumulated-depreciation / real-estate-net) | standard us-gaap |
| Per-industry extra | DCF-implied multiples panel | (none) | (none) | FFO/share + AFFO/share cross-check | SMOG/share NAV anchor (ASC 932-235) |

Below the per-share fair value display, the workspace also shows the live market price (from `comps.target_market.market_cap` / diluted shares) and the model-vs-market spread, colored green when the model is more bullish and rose when less. That answers the "cheap or rich vs my model?" question that's usually what the user came for.

Energy E&P shares the standard schema variant — the line items are standard us-gaap — but routes through a different `compute_projection` flavor on the backend. The frontend reflects this by reusing the standard summary cards + statements panel but distinguishing the slider labels and the no-terminal note in the projection table.

## Tech stack

- **Next.js 16** (App Router, Turbopack default)
- **React 19**
- **TypeScript** with strict mode
- **Tailwind CSS** for styling
- **Recharts** for the Monte Carlo histogram and sensitivity heatmap

## Local development

```bash
git clone https://github.com/kristenmartino/valuate-web
cd valuate-web
npm install
cp .env.example .env.local   # then set NEXT_PUBLIC_VALUATE_API
npm run dev
```

The dev server listens on `http://localhost:3000`. By default `.env.example` points `NEXT_PUBLIC_VALUATE_API` at the Railway-hosted backend; set it to `http://127.0.0.1:8000` when running the backend locally.

### Type-check

```bash
npx tsc --noEmit
```

No runtime tests on the frontend — the `lib/api.ts` types are mirrored from the Pydantic schemas, so contract drift surfaces as a TypeScript error at the boundary.

## Deployment

Deployed on Vercel.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_VALUATE_API` | yes | URL of the Railway-hosted valuate-api, e.g. `https://valuate-api.up.railway.app`. The Next.js rewrite in `next.config.ts` proxies `/api/*` to this origin. |
| `VALUATE_OVERRIDE_TOKEN` | optional | Bearer token for the backend's `/override` endpoint. **Server-side only** (no `NEXT_PUBLIC_` prefix), read by `proxy.ts` on the Vercel edge and injected as an `Authorization` header. Must match the same-named env var on the backend. When unset on both sides, `/override` runs unauthenticated. |

## License

MIT
