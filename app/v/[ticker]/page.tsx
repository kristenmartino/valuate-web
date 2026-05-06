import type { Metadata } from "next";
import Link from "next/link";

import Workspace from "@/components/Workspace";

// Next 16: params is a Promise; must await.
type Props = { params: Promise<{ ticker: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { ticker } = await props.params;
  return { title: ticker.toUpperCase() };
}

export default async function Page(props: Props) {
  const { ticker } = await props.params;
  const upper = ticker.toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to tickers
          </Link>
          <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {upper}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Workspace ticker={upper} />
      </main>
    </div>
  );
}
