"use client";

// Step-by-step extraction progress for the workspace's load state.
// Replaces the bare spinner + single-line "extracting..." message with a
// checklist that surfaces what the backend is actually doing across the
// ~15s first-extract window. Steps are inferred from the message that
// Workspace.tsx sets, since the backend's LangGraph nodes don't currently
// stream progress events — when they do, the matching can become exact
// instead of substring-based.

const STEPS: Array<{ id: string; label: string; matches: string[] }> = [
  { id: "cache", label: "Checking cache", matches: ["cache", "checking cache"] },
  {
    id: "extract",
    label: "Fetching 10-K from SEC + extracting (Track A: XBRL, Track B: Claude)",
    matches: ["10-k", "extracting", "fetching", "claude"],
  },
  {
    id: "defaults",
    label: "Computing default assumptions from historicals",
    matches: ["default assumptions", "loading default"],
  },
  {
    id: "value",
    label: "Running DCF + Monte Carlo + sensitivity grid",
    matches: ["valuation", "computing initial", "monte carlo"],
  },
];

type StepState = "done" | "active" | "pending";

function _stateForStep(currentMessage: string, stepIdx: number): StepState {
  const lower = currentMessage.toLowerCase();
  // Find the index of the currently-active step by message-substring match.
  const activeIdx = STEPS.findIndex((s) =>
    s.matches.some((m) => lower.includes(m)),
  );
  if (activeIdx < 0) return stepIdx === 0 ? "active" : "pending";
  if (stepIdx < activeIdx) return "done";
  if (stepIdx === activeIdx) return "active";
  return "pending";
}

export default function LoadingStepper({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-md">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Extracting…
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          First load is ~15s on a cache miss; instant once cached.
        </p>
        <ol className="mt-6 space-y-3">
          {STEPS.map((step, idx) => {
            const state = _stateForStep(message, idx);
            return (
              <li
                key={step.id}
                className="flex items-start gap-3 text-sm"
                aria-current={state === "active" ? "step" : undefined}
              >
                <StepIcon state={state} />
                <span
                  className={
                    state === "done"
                      ? "text-zinc-700 dark:text-zinc-300"
                      : state === "active"
                        ? "font-medium text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-400 dark:text-zinc-600"
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white dark:bg-emerald-600"
      >
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        aria-hidden
        className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700"
    />
  );
}
