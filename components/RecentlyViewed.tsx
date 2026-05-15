"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getRecentTickers } from "@/lib/recentlyViewed";

// Renders the user's recently-viewed tickers as a chip row above the
// curated grid. Hydrates from localStorage on mount; renders nothing
// (no skeleton, no padding) on first paint to avoid layout shift on
// users who haven't visited any ticker yet.

export default function RecentlyViewed() {
  const [tickers, setTickers] = useState<string[] | null>(null);

  useEffect(() => {
    setTickers(getRecentTickers());
  }, []);

  if (tickers === null || tickers.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        Recently viewed
      </h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {tickers.map((ticker) => (
          <Link
            key={ticker}
            href={`/v/${ticker}`}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-mono text-xs font-medium text-zinc-900 transition-colors hover:border-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            {ticker}
          </Link>
        ))}
      </div>
    </section>
  );
}
