"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonteCarloResult } from "@/lib/api";

export default function MonteCarloChart({ result }: { result: MonteCarloResult }) {
  const data = result.histogram.map(([edge, count]) => ({
    bin: edge,
    count,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="bin"
            tickFormatter={(v) => `$${Math.round(v)}`}
            tick={{ fontSize: 11, fill: "#71717a" }}
            stroke="#a1a1aa"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            stroke="#a1a1aa"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e4e4e7",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value) => [String(value), "count"]}
            labelFormatter={(label) => `~$${Number(label).toFixed(2)}/share`}
          />
          <ReferenceLine
            x={result.median}
            stroke="#18181b"
            strokeDasharray="3 3"
            label={{
              value: `median $${result.median.toFixed(0)}`,
              position: "top",
              fill: "#18181b",
              fontSize: 11,
            }}
          />
          <ReferenceLine x={result.p10} stroke="#a1a1aa" strokeDasharray="2 2" />
          <ReferenceLine x={result.p90} stroke="#a1a1aa" strokeDasharray="2 2" />
          <Bar dataKey="count" fill="#71717a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
