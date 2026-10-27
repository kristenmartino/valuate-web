"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type LineItem, sourceLabel } from "@/lib/api";

function SourceContent({ item, wrapAnywhere = false }: { item: LineItem; wrapAnywhere?: boolean }) {
  return (
    <div className="mt-1 space-y-2 border-l-2 border-zinc-300 pl-2 leading-relaxed dark:border-zinc-700">
      {item.source_quote && <p className={`whitespace-normal ${wrapAnywhere ? "[overflow-wrap:anywhere]" : "break-words"}`}>{item.source_quote.replace(/\s+/g, " ").trim()}</p>}
      {item.xbrl_tag && <p className="break-all font-mono">{item.xbrl_tag}</p>}
      {!item.source_quote && !item.xbrl_tag && <p>No supporting excerpt or tag was stored for this value.</p>}
      {item.source === "llm_html" && <p>AI-provided excerpt. Check it against the filing before relying on the value.</p>}
      {item.source === "user_override" && <p>Saved current correction. Earlier revisions are retained by the backend; individual reviewer identity is not recorded.</p>}
    </div>
  );
}

export default function SourceDetails({ item, label, tableCell = false }: { item: LineItem; label?: string; tableCell?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const accessibleLabel = label ? `${label}: ${sourceLabel(item.source)} source details` : `${sourceLabel(item.source)} source details`;

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  return (
    <>
      <details className={`${tableCell ? "hidden sm:block " : ""}mt-1 text-left text-xs text-zinc-600 dark:text-zinc-400`}>
        <summary aria-label={accessibleLabel} className="cursor-pointer rounded py-1 text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-teal-300">
          {sourceLabel(item.source)} · details
        </summary>
        <SourceContent item={item} />
      </details>
      {tableCell && <button type="button" aria-label={accessibleLabel} aria-haspopup="dialog" onClick={() => setOpen(true)} className="mt-1 block min-h-10 rounded py-1 text-left text-xs text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:hidden dark:text-teal-300">
        {sourceLabel(item.source)} · details
      </button>}
      {open && <dialog ref={dialog} aria-labelledby={titleId} onClose={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-lg border border-zinc-300 bg-white p-0 text-left text-sm text-zinc-700 shadow-xl [overflow-wrap:anywhere] backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-white p-4 dark:bg-zinc-900">
          <h3 id={titleId} className="min-w-0 font-semibold text-zinc-900 dark:text-zinc-100">{label ?? "Source details"}</h3>
          <button type="button" aria-label="Close source details" onClick={() => dialog.current?.close()} className="min-h-10 shrink-0 rounded border border-zinc-300 px-3 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-600">Close</button>
        </div>
        <div className="px-4 pb-4">
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{sourceLabel(item.source)}</p>
          <SourceContent item={item} wrapAnywhere />
        </div>
      </dialog>}
    </>
  );
}
