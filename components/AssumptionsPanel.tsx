"use client";

import type { Assumptions, Industry } from "@/lib/api";
import { formatPercent } from "@/lib/api";
import { sliderBounds, sliderKeyValue } from "@/lib/assumptionControls";

type SliderConfig = {
  key: keyof Assumptions;
  label: string;
  min: number;
  max: number;
  step: number;
};

type ContextField = Pick<SliderConfig, "key" | "label">;

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

const BANK_CONTEXT: ContextField[] = [
  { key: "operating_margin", label: "Return on equity (historical)" },
  { key: "tax_rate", label: "Tax rate (historical)" },
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

const INSURER_CONTEXT: ContextField[] = [
  { key: "tax_rate", label: "Tax rate (historical)" },
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
    label: "Approximate FFO growth (g)",
    min: 0.0,
    max: 0.08,
    step: 0.001,
  },
];

const REIT_CONTEXT: ContextField[] = [
  { key: "tax_rate", label: "Tax rate (historical)" },
];

// Energy uses revenue growth in a fixed ten-year cash-flow projection.
// Terminal growth is unused because this model has no terminal value.
const ENERGY_DRIVERS: SliderConfig[] = [
  {
    key: "revenue_growth",
    label: "Revenue growth",
    min: -0.15,
    max: 0.15,
    step: 0.005,
  },
  { key: "operating_margin", label: "Operating margin", min: 0, max: 0.6, step: 0.005 },
  { key: "wacc", label: "WACC", min: 0.05, max: 0.18, step: 0.001 },
];

const ENERGY_RATIOS: SliderConfig[] = [
  { key: "tax_rate", label: "Tax rate", min: 0, max: 0.45, step: 0.005 },
  { key: "capex_ratio", label: "Capex / revenue", min: 0, max: 0.5, step: 0.005 },
  { key: "da_ratio", label: "Depletion+D&A / revenue", min: 0, max: 0.4, step: 0.005 },
  {
    key: "working_capital_ratio",
    label: "ΔWC / ΔRevenue",
    min: -0.2,
    max: 0.3,
    step: 0.005,
  },
];

export default function AssumptionsPanel({
  value,
  startingValues,
  onChange,
  industry = "standard",
  combinedDa = false,
}: {
  value: Assumptions;
  startingValues: Assumptions;
  onChange: (next: Assumptions) => void;
  industry?: Industry;
  combinedDa?: boolean;
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
          startingValues={startingValues}
          update={update}
        />
        <HistoricalContext fields={BANK_CONTEXT} value={value} />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          This workspace uses the Gordon dividend discount model:{" "}
          <code>P = D₀(1+g) / (r−g)</code>. Cost of equity and dividend growth
          drive the estimate. Historical figures are shown for context.
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
          startingValues={startingValues}
          update={update}
        />
        <HistoricalContext fields={INSURER_CONTEXT} value={value} />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          This workspace uses a simplified justified price-to-book model:{" "}
          <code>P/B = (ROE − g) / (r − g)</code>, then{" "}
          <code>estimated value/share = book value/share × P/B</code>. The
          estimate uses book value per share and the selected ROE, growth,
          and cost of equity.
        </p>
      </div>
    );
  }

  if (industry === "reit") {
    return (
      <div className="space-y-8">
        <Group
          title="Gordon growth inputs — approximate FFO"
          sliders={REIT_DRIVERS}
          value={value}
          startingValues={startingValues}
          update={update}
        />
        <HistoricalContext fields={REIT_CONTEXT} value={value} />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          This workspace uses approximate FFO (net income + D&amp;A), which
          omits other Nareit adjustments. Estimated value/share ={" "}
          <code>approximate FFO/share × (1 + g) / (r − g)</code>. Open the
          calculations beside the estimate to inspect the inputs.
        </p>
      </div>
    );
  }

  if (industry === "energy") {
    return (
      <div className="space-y-8">
        <Group
          title="Forward-looking drivers (Monte Carlo inputs)"
          sliders={ENERGY_DRIVERS}
          value={value}
          startingValues={startingValues}
          update={update}
        />
        <Group
          title="Historical ratios"
          sliders={ENERGY_RATIOS}
          value={value}
          startingValues={startingValues}
          update={update}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          This prototype uses a fixed ten-year cash-flow projection with no
          terminal value. It does not estimate company-specific reserve life.
          Revenue growth changes projected sales; the model does not separately
          forecast production volumes or commodity prices.
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
        startingValues={startingValues}
        update={update}
      />
      <Group
        title="Historical ratios"
        sliders={STANDARD_RATIOS.map(s => s.key === "da_ratio" && combinedDa ? { ...s, label: "D&A + other / revenue" } : s)}
        value={value}
        startingValues={startingValues}
        update={update}
      />
    </div>
  );
}

function HistoricalContext({
  fields,
  value,
}: {
  fields: ContextField[];
  value: Assumptions;
}) {
  return (
    <section aria-label="Historical context">
      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        Historical context (read-only)
      </h4>
      <dl className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 font-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatPercent(value[key], 2)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Group({
  title,
  sliders,
  value,
  startingValues,
  update,
}: {
  title: string;
  sliders: SliderConfig[];
  value: Assumptions;
  startingValues: Assumptions;
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
            startingValue={startingValues[s.key]}
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
  startingValue,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  startingValue: number;
  onChange: (n: number) => void;
}) {
  const bounds = sliderBounds({ min, max, step }, value, startingValue);
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
        min={bounds.min}
        max={bounds.max}
        step="any"
        value={value}
        aria-valuetext={formatPercent(value, 2)}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => {
          const next = sliderKeyValue(e.key, value, { ...bounds, step });
          if (next !== null) {
            e.preventDefault();
            onChange(next);
          }
        }}
        className="mt-1.5 w-full accent-zinc-900 dark:accent-zinc-100"
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>{formatPercent(bounds.min, 1)}</span>
        <span>{formatPercent(bounds.max, 1)}</span>
      </div>
    </label>
  );
}
