"use client";

import type { Assumptions, Industry } from "@/lib/api";
import { formatPercent } from "@/lib/api";

type SliderConfig = {
  key: keyof Assumptions;
  label: string;
  min: number;
  max: number;
  step: number;
};

// Standard (FCFF DCF) sliders: 4 MC drivers + 4 historical-derived ratios.
const STANDARD_DRIVERS: SliderConfig[] = [
  { key: "revenue_growth", label: "Revenue growth", min: -0.1, max: 0.25, step: 0.005 },
  { key: "operating_margin", label: "Operating margin", min: 0, max: 0.6, step: 0.005 },
  { key: "terminal_growth", label: "Terminal growth", min: 0, max: 0.05, step: 0.001 },
  { key: "wacc", label: "WACC", min: 0.04, max: 0.18, step: 0.001 },
];

const STANDARD_RATIOS: SliderConfig[] = [
  { key: "tax_rate", label: "Tax rate", min: 0, max: 0.45, step: 0.005 },
  { key: "capex_ratio", label: "Capex / revenue", min: 0, max: 0.2, step: 0.001 },
  { key: "da_ratio", label: "D&A / revenue", min: 0, max: 0.15, step: 0.001 },
  {
    key: "working_capital_ratio",
    label: "ΔWC / ΔRevenue",
    min: -0.2,
    max: 0.3,
    step: 0.005,
  },
];

// Bank DDM sliders: only two inputs actually drive the model (cost of equity
// and dividend growth), with historical context shown read-only.
const BANK_DRIVERS: SliderConfig[] = [
  {
    key: "wacc",
    label: "Cost of equity (r)",
    min: 0.05,
    max: 0.18,
    step: 0.001,
  },
  {
    key: "terminal_growth",
    label: "Dividend growth (g)",
    min: 0.0,
    max: 0.1,
    step: 0.001,
  },
];

const BANK_CONTEXT: SliderConfig[] = [
  { key: "operating_margin", label: "Return on equity (historical)", min: 0, max: 0.4, step: 0.005 },
  { key: "tax_rate", label: "Tax rate (historical)", min: 0, max: 0.45, step: 0.005 },
];

// Insurer justified-P/B sliders: ROE is a real input here (not just context —
// it directly multiplies into the formula), alongside r and g.
const INSURER_DRIVERS: SliderConfig[] = [
  {
    key: "operating_margin",
    label: "Return on equity (ROE)",
    min: 0,
    max: 0.3,
    step: 0.005,
  },
  {
    key: "wacc",
    label: "Cost of equity (r)",
    min: 0.05,
    max: 0.18,
    step: 0.001,
  },
  {
    key: "terminal_growth",
    label: "Long-term growth (g)",
    min: 0.0,
    max: 0.08,
    step: 0.001,
  },
];

const INSURER_CONTEXT: SliderConfig[] = [
  { key: "tax_rate", label: "Tax rate (historical)", min: 0, max: 0.45, step: 0.005 },
];

// REIT FFO-multiple sliders: Gordon growth on FFO, so the same two drivers
// as a bank DDM (cost of equity + growth), but the growth rate is FFO growth
// rather than dividend growth. r is set lower by default because REITs trade
// like long-duration bond proxies given their pass-through dividend regime.
const REIT_DRIVERS: SliderConfig[] = [
  {
    key: "wacc",
    label: "Cost of equity (r)",
    min: 0.04,
    max: 0.15,
    step: 0.001,
  },
  {
    key: "terminal_growth",
    label: "FFO growth (g)",
    min: 0.0,
    max: 0.08,
    step: 0.001,
  },
];

const REIT_CONTEXT: SliderConfig[] = [
  { key: "tax_rate", label: "Tax rate (historical)", min: 0, max: 0.45, step: 0.005 },
];

export default function AssumptionsPanel({
  value,
  onChange,
  industry = "standard",
}: {
  value: Assumptions;
  onChange: (next: Assumptions) => void;
  industry?: Industry;
}) {
  const update = (key: keyof Assumptions, n: number) => {
    onChange({ ...value, [key]: n });
  };

  if (industry === "bank") {
    return (
      <div className="space-y-8">
        <Group
          title="DDM inputs — Gordon dividend discount model"
          sliders={BANK_DRIVERS}
          value={value}
          update={update}
        />
        <Group
          title="Historical context (informational)"
          sliders={BANK_CONTEXT}
          value={value}
          update={update}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Banks aren&apos;t valued via FCFF — the cash flow statement is dominated
          by deposit/loan flows rather than free cash flow. This workspace uses
          the Gordon DDM: <code>P = D₀(1+g) / (r−g)</code>. The other DCF
          sliders (revenue growth, capex/D&amp;A ratios) don&apos;t apply.
        </p>
      </div>
    );
  }

  if (industry === "insurer") {
    return (
      <div className="space-y-8">
        <Group
          title="Justified-P/B inputs"
          sliders={INSURER_DRIVERS}
          value={value}
          update={update}
        />
        <Group
          title="Historical context (informational)"
          sliders={INSURER_CONTEXT}
          value={value}
          update={update}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Insurers are valued via a justified price-to-book multiple:{" "}
          <code>P/B = (ROE − g) / (r − g)</code>, then{" "}
          <code>fair value/share = book value/share × P/B</code>. Reserves and
          investments dominate the balance sheet, so book value is the
          economic anchor. FCFF doesn&apos;t fit this business model.
        </p>
      </div>
    );
  }

  if (industry === "reit") {
    return (
      <div className="space-y-8">
        <Group
          title="FFO-multiple inputs — Gordon growth on FFO"
          sliders={REIT_DRIVERS}
          value={value}
          update={update}
        />
        <Group
          title="Historical context (informational)"
          sliders={REIT_CONTEXT}
          value={value}
          update={update}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          REITs are valued on Funds From Operations:{" "}
          <code>FFO = net income + D&amp;A</code>. GAAP depreciation
          overstates economic depreciation for well-maintained real estate,
          so FFO — not net income — is the conventional cash-earnings
          measure. Fair value/share ={" "}
          <code>FFO/share × (1 + g) / (r − g)</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Group
        title="Forward-looking drivers (Monte Carlo inputs)"
        sliders={STANDARD_DRIVERS}
        value={value}
        update={update}
      />
      <Group
        title="Historical ratios"
        sliders={STANDARD_RATIOS}
        value={value}
        update={update}
      />
    </div>
  );
}

function Group({
  title,
  sliders,
  value,
  update,
}: {
  title: string;
  sliders: SliderConfig[];
  value: Assumptions;
  update: (key: keyof Assumptions, n: number) => void;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        {title}
      </h4>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        {sliders.map((s) => (
          <Slider
            key={s.key}
            label={s.label}
            min={s.min}
            max={s.max}
            step={s.step}
            value={value[s.key]}
            onChange={(n) => update(s.key, n)}
          />
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="font-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatPercent(value, 2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-zinc-900 dark:accent-zinc-100"
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>{formatPercent(min, 1)}</span>
        <span>{formatPercent(max, 1)}</span>
      </div>
    </label>
  );
}
