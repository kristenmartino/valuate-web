"use client";

import type { SensitivityGrid } from "@/lib/api";
import { formatPercent, formatUSD } from "@/lib/api";

// Linear color scale from low (cool) to high (warm) across all non-null cells.
function colorFor(value: number, min: number, max: number): string {
  if (max === min) return "rgba(63, 63, 70, 0.25)";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Interpolate zinc-100 → emerald-600 in HSL
  const hue = 160; // emerald-ish
  const lightness = 95 - t * 50; // 95% (very pale) → 45%
  return `hsl(${hue} 50% ${lightness}%)`;
}

export default function SensitivityHeatmap({ grid }: { grid: SensitivityGrid }) {
  const flat = grid.values.flat().filter((v): v is number => v !== null);
  const min = flat.length > 0 ? Math.min(...flat) : 0;
  const max = flat.length > 0 ? Math.max(...flat) : 0;

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-px text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-right font-mono font-medium text-zinc-500">
              ↓ rev / op →
            </th>
            {grid.operating_margin_axis.map((om) => (
              <th
                key={om}
                className="px-2 py-1 font-mono font-medium text-zinc-600 dark:text-zinc-400"
              >
                {formatPercent(om, 1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.values.map((row, i) => (
            <tr key={i}>
              <th className="px-2 py-1 text-right font-mono font-medium text-zinc-600 dark:text-zinc-400">
                {formatPercent(grid.revenue_growth_axis[i], 1)}
              </th>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-2 py-1 text-center font-mono tabular-nums"
                  style={{
                    backgroundColor:
                      cell !== null ? colorFor(cell, min, max) : "#f4f4f5",
                    color: cell !== null && (cell - min) / (max - min || 1) > 0.55 ? "#052e16" : "#27272a",
                  }}
                >
                  {cell !== null ? formatUSD(cell).replace("$", "$") : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
