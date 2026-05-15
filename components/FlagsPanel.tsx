"use client";

import { useState } from "react";

import {
  type Company,
  type ExtractionFlag,
  formatMoney,
  lookupLineItem,
  putOverride,
} from "@/lib/api";

// Accept formatted dollar amounts like "$25,596,000,000", "25596000000", or
// "25.6B" / "25.6b" shorthand. Returns the integer USD string the API expects,
// or null if the input doesn't look like a number.
function parseUsdInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase().replace(/[$,\s]/g, "");
  let multiplier = 1;
  let body = lower;
  if (body.endsWith("b")) {
    multiplier = 1_000_000_000;
    body = body.slice(0, -1);
  } else if (body.endsWith("m")) {
    multiplier = 1_000_000;
    body = body.slice(0, -1);
  } else if (body.endsWith("k")) {
    multiplier = 1_000;
    body = body.slice(0, -1);
  }
  if (!/^-?\d+(\.\d+)?$/.test(body)) return null;
  const value = Number(body) * multiplier;
  if (!Number.isFinite(value)) return null;
  // Round to integer USD; the schema's Decimal accepts string form.
  return Math.round(value).toString();
}

type Props = {
  ticker: string;
  flags: ExtractionFlag[];
  company: Company;
  onOverride: (updated: Company) => void;
};

export default function FlagsPanel({
  ticker,
  flags,
  company,
  onOverride,
}: Props) {
  if (flags.length === 0) return null;
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-6 dark:border-amber-900/60 dark:bg-amber-950/30">
      <header className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
          Extraction flags
        </h3>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {flags.length} item{flags.length === 1 ? "" : "s"} — review and override against the filing
        </span>
      </header>
      <ul className="mt-4 space-y-3">
        {flags.map((flag) => (
          <FlagRow
            key={flag.field_path}
            ticker={ticker}
            flag={flag}
            company={company}
            onOverride={onOverride}
          />
        ))}
      </ul>
    </section>
  );
}

function FlagRow({
  ticker,
  flag,
  company,
  onOverride,
}: {
  ticker: string;
  flag: ExtractionFlag;
  company: Company;
  onOverride: (updated: Company) => void;
}) {
  const item = lookupLineItem(company, flag.field_path);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(flag.current_value);
  const [sourceQuote, setSourceQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseUsdInput(value);
  const previewBillions =
    parsed !== null && Number(parsed) >= 1e6
      ? formatMoney(parsed)
      : null;

  async function submit() {
    if (parsed === null) {
      setError("Couldn't parse a number from that input.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await putOverride(ticker, {
        field_path: flag.field_path,
        value: parsed,
        source_quote: sourceQuote || null,
      });
      onOverride(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-md border border-amber-200/60 bg-white p-4 dark:border-amber-900/40 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <code className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {flag.field_path}
        </code>
        <span className="text-xs text-amber-800 dark:text-amber-300">
          {flag.reason}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatMoney(flag.current_value)}
        </span>
        {item && (
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-500">
            source: {item.source} · conf {item.confidence.toFixed(2)}
          </span>
        )}
      </div>
      {item?.source_quote && (
        <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 text-sm italic text-zinc-700 dark:border-amber-700 dark:text-zinc-300">
          “{item.source_quote.replace(/\s+/g, " ").trim()}”
        </blockquote>
      )}
      {item?.xbrl_tag && !item.source_quote && (
        <div className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-500">
          {item.xbrl_tag}
        </div>
      )}

      <div className="mt-3">
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Override
          </button>
        )}
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-2"
          >
            <label className="block">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Corrected value — accepts <code>25596000000</code>,{" "}
                <code>$25,596,000,000</code>, or <code>25.6B</code>
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-500">
                {previewBillions !== null
                  ? `Will be sent as ${parsed} (${previewBillions})`
                  : value
                  ? "Couldn't parse a number from that"
                  : ""}
              </span>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Source quote (optional — paste from filing for audit trail)
              </span>
              <input
                type="text"
                value={sourceQuote}
                onChange={(e) => setSourceQuote(e.target.value)}
                placeholder='e.g. "Operating income 25,596 24,378 21,889"'
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {submitting ? "Saving…" : "Save override"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setValue(flag.current_value);
                  setSourceQuote("");
                  setError(null);
                }}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              {error && (
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              )}
            </div>
          </form>
        )}
      </div>
    </li>
  );
}
