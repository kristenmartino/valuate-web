"use client";

// localStorage-backed recently-viewed ticker tracking. Survives reloads,
// scoped per-browser. Keeps the last 6 distinct tickers, newest first.
// Used by:
//   - Workspace.tsx (records on successful workspace load)
//   - Home page's RecentlyViewed component (renders as a chip row)

const STORAGE_KEY = "valuate.recently_viewed";
const MAX_ENTRIES = 6;

function _read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}

function _write(tickers: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
  } catch {
    // Quota exceeded, private mode, etc. — this is a polish feature, not
    // load-bearing, so silently no-op rather than alerting.
  }
}

export function getRecentTickers(): string[] {
  return _read();
}

export function recordTickerVisit(ticker: string): void {
  const upper = ticker.toUpperCase();
  const existing = _read().filter((t) => t !== upper);
  const next = [upper, ...existing].slice(0, MAX_ENTRIES);
  _write(next);
}
