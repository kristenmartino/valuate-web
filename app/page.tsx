import Link from "next/link";

const TICKERS: Array<{ ticker: string; name: string; sector?: string }> = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corporation" },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "NVDA", name: "NVIDIA Corporation" },
  { ticker: "COST", name: "Costco Wholesale Corporation" },
  { ticker: "HD", name: "The Home Depot, Inc." },
  { ticker: "NKE", name: "NIKE, Inc." },
  { ticker: "JNJ", name: "Johnson & Johnson" },
  { ticker: "KO", name: "The Coca-Cola Company" },
  { ticker: "CAT", name: "Caterpillar Inc." },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Bank · DDM" },
  { ticker: "PRU", name: "Prudential Financial, Inc.", sector: "Insurer · P/B" },
  { ticker: "PLD", name: "Prologis, Inc.", sector: "REIT · FFO" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Valuate
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          AI-augmented DCF agent. Pick a ticker to extract its latest 10-K and
          run a Monte Carlo valuation.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TICKERS.map(({ ticker, name, sector }) => (
            <Link
              key={ticker}
              href={`/v/${ticker}`}
              className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
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
          First load for a ticker takes ~15s (SEC fetch + Claude extraction).
          Subsequent assumption changes are instant.
        </p>
      </main>
    </div>
  );
}
