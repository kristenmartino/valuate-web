"use client";

import { useState } from "react";
import SourceDetails from "./SourceDetails";
import { correctionOptions, correctionRequest, parseCorrectionValue } from "@/lib/corrections";

import {
  type Company,
  type ExtractionFlag,
  formatLineItem,
  isShareField,
  putOverride,
} from "@/lib/api";

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
          Items to review
        </h3>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {flags.length} item{flags.length === 1 ? "" : "s"} — check against the filing before correcting
        </span>
      </header>
      <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">Corrections replace the saved current value. Reviewer identity and earlier corrections are not retained.</p>
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
  const aggregateFlag = flag.field_path === "balance_sheet";
  const options = correctionOptions(company, flag);
  const [editing, setEditing] = useState(false);
  const [fieldPath, setFieldPath] = useState(aggregateFlag ? "" : flag.field_path);
  const [value, setValue] = useState(aggregateFlag ? "" : flag.current_value);
  const [sourceQuote, setSourceQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const selected = options.find((option) => option.fieldPath === fieldPath);
  const item = selected?.item;
  const shareField = isShareField(fieldPath);
  const parsed = shareField && value.includes("$") ? null : parseCorrectionValue(value);
  const preview = parsed !== null ? formatLineItem(parsed, fieldPath) : null;
  const fieldLabel = aggregateFlag
    ? "Balance-sheet reconciliation"
    : options[0]?.label ?? flag.field_path.split(".").at(-1)!.replaceAll("_", " ");

  function selectField(nextPath: string) {
    const next = options.find((option) => option.fieldPath === nextPath);
    setFieldPath(nextPath);
    setValue(next?.item.value ?? "");
    setSourceQuote(next?.item.source_quote ?? "");
    setError(null);
  }

  function startEditing() {
    setSaved(null);
    setError(null);
    selectField(aggregateFlag ? "" : flag.field_path);
    setEditing(true);
  }

  async function submit() {
    setError(null);
    let request;
    try {
      request = correctionRequest(company, flag, fieldPath, value, sourceQuote);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    setSubmitting(true);
    try {
      const updated = await putOverride(ticker, request);
      onOverride(updated);
      setEditing(false);
      setSaved(`${selected?.label ?? fieldLabel} saved. Automated checks ran again.${
        updated.extraction_flags.some((next) => next.field_path === flag.field_path)
          ? " This check still needs review."
          : ""
      }`);
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
          {fieldLabel}
        </code>
        <span className="text-xs text-amber-800 dark:text-amber-300">
          {flag.reason}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
          {aggregateFlag ? "Current total assets: " : ""}
          {formatLineItem(flag.current_value, flag.field_path)}
        </span>
      </div>
      {item && <SourceDetails item={item} label={selected?.label ?? fieldLabel} />}
      {saved && <p role="status" className="mt-3 text-sm text-teal-800 dark:text-teal-300">{saved}</p>}

      <div className="mt-3">
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            disabled={options.length === 0}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Correct value
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
            {aggregateFlag && (
              <label className="block">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Balance-sheet field to correct
                </span>
                <select
                  value={fieldPath}
                  onChange={(e) => selectField(e.target.value)}
                  required
                  disabled={submitting}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">Choose a balance-sheet field</option>
                  {options.map((option) => (
                    <option key={option.fieldPath} value={option.fieldPath}>
                      {option.label} — {formatLineItem(option.item.value, option.fieldPath)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  Check assets, liabilities, equity coverage, and any noncontrolling interests against the filing, then select the line that needs correction.
                </span>
              </label>
            )}
            <label className="block">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Corrected value{selected ? ` for ${selected.label}` : ""} ({shareField ? "shares" : "USD"}) — accepts plain numbers or K, M, B suffixes
              </span>
              <input
                type="text"
                inputMode="decimal"
                disabled={!selected || submitting}
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-500">
                {preview !== null
                  ? `Save ${parsed} ${shareField ? "shares" : "USD"} (${preview})`
                  : value
                  ? "Couldn't parse a number from that"
                  : ""}
              </span>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Supporting excerpt (optional — paste from the filing)
              </span>
              <input
                type="text"
                value={sourceQuote}
                disabled={!selected || submitting}
                onChange={(e) => setSourceQuote(e.target.value)}
                placeholder='e.g. "Operating income 25,596 24,378 21,889"'
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting || !selected || parsed === null}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {submitting ? "Saving…" : "Save correction"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  selectField(aggregateFlag ? "" : flag.field_path);
                }}
                disabled={submitting}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              {error && (
                <span role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</span>
              )}
            </div>
          </form>
        )}
      </div>
    </li>
  );
}
