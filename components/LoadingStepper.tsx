"use client";

export default function LoadingStepper({ message }: { message: string }) {
  return (
    <div role="status" className="border-y border-zinc-200 py-10 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-700 motion-reduce:animate-none" />
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Preparing workspace</h2>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Uncached companies require a filing fetch and extraction before the model can run.</p>
    </div>
  );
}
