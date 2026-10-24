"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidTicker, normalizeTicker } from "@/lib/tickers";

// Recognizing a ticker does not establish extraction or valuation coverage.
export default function TickerSearch() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = normalizeTicker(ticker);
    if (!t) {
      setError("Enter a ticker");
      return;
    }
    if (!isValidTicker(t)) {
      setError("Use 1–5 letters with an optional class letter, e.g. AMZN or BRK.B. Ticker recognition does not guarantee valuation coverage.");
      return;
    }
    setError(null);
    setNavigating(true);
    router.push(`/v/${t}`);
  }

  return (
    <section className="mt-10 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
        Find a company
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Enter a US ticker with a SEC 10-K filing. Extraction can fail when required data is missing. Banks, insurers, REITs, and energy companies use separate models; other companies use a five-year cash-flow model that may not suit their business.
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
          {navigating ? "Loading…" : "Open workspace"}
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
