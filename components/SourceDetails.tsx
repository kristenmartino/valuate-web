import { type LineItem, sourceLabel } from "@/lib/api";

export default function SourceDetails({ item, label }: { item: LineItem; label?: string }) {
  return (
    <details className="mt-1 text-left text-xs text-zinc-600 dark:text-zinc-400">
      <summary aria-label={label ? `${label}: ${sourceLabel(item.source)} source details` : undefined} className="cursor-pointer rounded py-1 text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-teal-300">
        {sourceLabel(item.source)} · details
      </summary>
      <div className="mt-1 space-y-2 border-l-2 border-zinc-300 pl-2 leading-relaxed dark:border-zinc-700">
        {item.source_quote && <p className="whitespace-normal break-words">{item.source_quote.replace(/\s+/g, " ").trim()}</p>}
        {item.xbrl_tag && <p className="break-all font-mono">{item.xbrl_tag}</p>}
        {!item.source_quote && !item.xbrl_tag && <p>No supporting excerpt or tag was stored for this value.</p>}
        {item.source === "llm_html" && <p>AI-provided excerpt. Check it against the filing before relying on the value.</p>}
        {item.source === "user_override" && <p>Saved current correction; reviewer identity and previous values are not recorded.</p>}
      </div>
    </details>
  );
}
