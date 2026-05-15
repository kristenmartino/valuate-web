// Parse the raw fetch-error string from lib/api.ts's `request<T>()` into
// human-readable text + an optional "what to do about it" hint. The raw
// shape is `${status} ${path}: ${responseText}` with `responseText`
// usually being the FastAPI `{"detail": "..."}` JSON.

export type FriendlyError = {
  title: string;
  hint?: string;
  raw: string;
};

const TICKER_NOT_FOUND = /not found in SEC database/i;
const RATE_LIMITED = /too many extracts/i;
const NO_FILING = /no 10-?K found/i;
const COMPOSITION = /required fields still missing/i;
const UNAUTHORIZED = /^401\b/;

function _detail(raw: string): string {
  // Try to parse `{"detail":"..."}` out of the fetch error's text payload.
  const match = raw.match(/\{[^{}]*"detail":\s*"([^"]+)"/);
  if (match) return match[1];
  // Pydantic validation errors are arrays of detail objects; show the first.
  const arrMatch = raw.match(/"msg":\s*"([^"]+)"/);
  if (arrMatch) return arrMatch[1];
  return raw;
}

export function parseFetchError(raw: string): FriendlyError {
  const detail = _detail(raw);

  if (TICKER_NOT_FOUND.test(detail)) {
    return {
      title: "Ticker not found on SEC EDGAR",
      hint: "Check the spelling, or try a ticker that's filed with the SEC. Foreign-only listings (e.g. NESN, RHHBY ADR variants) and recently-renamed companies sometimes don't resolve.",
      raw,
    };
  }
  if (RATE_LIMITED.test(detail) || /\b429\b/.test(raw)) {
    return {
      title: "Rate-limited",
      hint: "Extracts are capped at 10/hour per IP because each call invokes Claude. Try again in a few minutes — or pick a ticker from the curated grid that's already cached.",
      raw,
    };
  }
  if (NO_FILING.test(detail)) {
    return {
      title: "No recent 10-K found for this filer",
      hint: "Some filers (newly listed, foreign private issuers, or companies in transition) don't have a 10-K in SEC's recent-filings window. Try the curated grid instead.",
      raw,
    };
  }
  if (COMPOSITION.test(detail)) {
    return {
      title: "This filer's 10-K is missing required tags",
      hint: "Track A (XBRL) and Track B (Claude) couldn't fill some required line items. The architecture can't compose a valid Company without them — the curated 14-ticker grid is verified to extract cleanly.",
      raw,
    };
  }
  if (UNAUTHORIZED.test(raw)) {
    return {
      title: "Unauthorized",
      hint: "The override endpoint requires a token that the workspace's frontend proxy injects automatically. If you're seeing this, the proxy isn't firing — refresh and try again.",
      raw,
    };
  }
  return {
    title: "Something went wrong",
    hint: "The raw error is shown below — share it if you're reporting a bug.",
    raw,
  };
}
