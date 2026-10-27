import Link from "next/link";

import RecentlyViewed from "@/components/RecentlyViewed";
import TickerSearch from "@/components/TickerSearch";

const TICKERS: Array<{ ticker: string; name: string; sector?: string }> = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corporation" },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "AMZN", name: "Amazon.com, Inc." },
  { ticker: "META", name: "Meta Platforms, Inc." },
  { ticker: "NVDA", name: "NVIDIA Corporation" },
  { ticker: "COST", name: "Costco Wholesale Corporation" },
  { ticker: "WMT", name: "Walmart Inc." },
  { ticker: "HD", name: "The Home Depot, Inc." },
  { ticker: "NKE", name: "NIKE, Inc." },
  { ticker: "JNJ", name: "Johnson & Johnson" },
  { ticker: "KO", name: "The Coca-Cola Company" },
  { ticker: "F", name: "Ford Motor Company" },
  { ticker: "CAT", name: "Caterpillar Inc." },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Bank · DDM" },
  { ticker: "PRU", name: "Prudential Financial, Inc.", sector: "Insurer · P/B" },
  { ticker: "PLD", name: "Prologis, Inc.", sector: "REIT · FFO" },
  { ticker: "EOG", name: "EOG Resources, Inc.", sector: "Energy E&P · 10-year FCFF" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Valuate
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Explore company valuations from SEC filings.
        </p>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Review extracted financials and their sources, adjust assumptions, and compare valuation scenarios.
        </p>
        <TickerSearch />
        <RecentlyViewed />
        <h2 className="mt-10 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sample companies</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">18 examples across five model categories. You can also enter a SEC 10-K ticker. New filings are checked from their source statements; valuation is withheld when required coverage cannot be established.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TICKERS.map(({ ticker, name, sector }) => (
            <Link
              key={ticker}
              href={`/v/${ticker}`}
              className="group flex items-center justify-between border-b border-zinc-200 px-1 py-3 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {ticker}
                  </span>
                  {sector && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {sector}
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {name}
                </div>
              </div>
              <span className="text-zinc-400 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs text-zinc-500 dark:text-zinc-500">
          Portfolio prototype. Review the source data and model assumptions before interpreting a valuation.
        </p>
      </main>
    </div>
  );
}
