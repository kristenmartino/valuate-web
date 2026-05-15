"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Free-text ticker entry — the escape hatch from the curated 14-ticker grid.
// Any SEC-filed US company works at extraction time (the backend's SIC
// classifier picks an Industry from the submissions response). What the
// caveat copy below makes explicit is that companies outside the five
// supported industries fall back to standard 5-year FCFF, which may not
// fit their business model.
export default function TickerSearch() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (!t) {
      setError("Enter a ticker");
      return;
    }
    // SEC tickers are 1–5 letters, occasionally with a class suffix
    // (BRK.B, BF-B). Allow letters plus a single `.` or `-` in the middle.
    if (!/^[A-Z][A-Z]*([.-][A-Z]+)?$/.test(t) || t.length > 6) {
      setError("Tickers are 1–5 letters, e.g. AMZN or BRK.B");
      return;
    }
    setError(null);
    setNavigating(true);
    router.push(`/v/${t}`);
  }

  return (
    <section className="mt-10 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
        Try another ticker
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Any SEC-filed US company works. Banks, insurers, REITs, and E&amp;P
        route to their dedicated valuation flavors based on SIC code; anything
        else runs the standard 5-year FCFF DCF — which may not fit the
        business if it isn&apos;t a clean industrial.
      </p>
      <form onSubmit={submit} className="mt-4 flex items-start gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => {
            setTicker(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. AMZN"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Ticker symbol"
          aria-invalid={error !== null}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm uppercase text-zinc-900 placeholder:font-sans placeholder:normal-case placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={navigating || ticker.trim().length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {navigating ? "Loading…" : "Value"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
