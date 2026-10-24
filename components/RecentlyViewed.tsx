"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { getRecentTickers } from "@/lib/recentlyViewed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function snapshot() {
  return getRecentTickers().join(",");
}

export default function RecentlyViewed() {
  const saved = useSyncExternalStore(subscribe, snapshot, () => "");
  const tickers = saved ? saved.split(",") : [];
  if (tickers.length === 0) return null;

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
