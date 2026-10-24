"use client";

import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { type MonteCarloResult, formatUSD } from "@/lib/api";

export default function MonteCarloChart({ result }: { result: MonteCarloResult }) {
  const [fullRange, setFullRange] = useState(false);
  const central = result.central_histogram;
  const showCentral = !!central && !fullRange;
  const histogram = showCentral ? central.histogram : result.histogram;
  const width = histogram.length > 1 ? histogram[1][0] - histogram[0][0] : 0;
  const data = histogram.map(([edge, count]) => ({ bin: edge + width / 2, start: edge, count }));
  const bounds: [number, number] = showCentral
    ? [central.lower_bound, central.upper_bound]
    : [histogram[0]?.[0] ?? 0, (histogram.at(-1)?.[0] ?? 1) + width];
  const shown = histogram.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="min-w-0">
      {central && (
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Simulation chart range">
          <button type="button" aria-pressed={!fullRange} onClick={() => setFullRange(false)}
            className="rounded border border-zinc-400 px-3 py-1.5 text-sm aria-pressed:bg-teal-100 aria-pressed:text-teal-950 dark:aria-pressed:bg-teal-900 dark:aria-pressed:text-teal-100">
            10th–90th percentile view
          </button>
          <button type="button" aria-pressed={fullRange} onClick={() => setFullRange(true)}
            className="rounded border border-zinc-400 px-3 py-1.5 text-sm aria-pressed:bg-teal-100 aria-pressed:text-teal-950 dark:aria-pressed:bg-teal-900 dark:aria-pressed:text-teal-100">
            Full range
          </button>
        </div>
      )}
      <p role="status" className="mb-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
        {showCentral
          ? `Chart range: ${formatUSD(central.lower_bound)}–${formatUSD(central.upper_bound)}. ${shown.toLocaleString()} of ${result.iterations_completed.toLocaleString()} completed simulations shown; ${central.below_count.toLocaleString()} below and ${central.above_count.toLocaleString()} above this range.`
          : `Full range: all ${result.iterations_completed.toLocaleString()} completed simulations shown.`}{" "}
        Summary statistics use all completed simulations.
      </p>
      <div className="h-72 w-full min-w-0" aria-label={showCentral ? "Histogram between the 10th and 90th percentiles" : "Histogram of all completed simulations"}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 24, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#a1a1aa" />
            <XAxis type="number" domain={bounds} dataKey="bin" tickCount={5} allowDataOverflow
              tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
              tick={{ fontSize: 11, fill: "#71717a" }} stroke="#a1a1aa" />
            <YAxis tick={{ fontSize: 11, fill: "#71717a" }} stroke="#a1a1aa" allowDecimals={false} width={48} />
            <Tooltip
              contentStyle={{ backgroundColor: "#ffffff", color: "#18181b", border: "1px solid #a1a1aa", borderRadius: "6px", fontSize: "12px" }}
              itemStyle={{ color: "#18181b" }} labelStyle={{ color: "#18181b" }}
              formatter={(value) => [String(value), "Simulations"]}
              labelFormatter={(label, payload) => `Bin starts at ${formatUSD(Number(payload[0]?.payload?.start ?? label))}/share`} />
            <ReferenceLine x={result.median} stroke="#0d9488" strokeDasharray="3 3"
              label={{ value: `Median ${formatUSD(result.median)}`, position: "top", fill: "#0d9488", fontSize: 11 }} />
            <Bar dataKey="count" fill="#71717a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
