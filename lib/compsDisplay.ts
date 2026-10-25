import type { PeerMultiples } from "./api";

export function formatMultiple(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}x`
    : "—";
}

// Match the API's positive-value median policy. Only returned peers count;
// the target and DCF-implied rows are not members of this population.
export function positivePeerCounts(peers: readonly PeerMultiples[]) {
  const count = (key: "pe_ratio" | "ev_revenue" | "ev_ebitda") =>
    peers.filter((peer) => {
      const value = peer[key];
      return typeof value === "number" && Number.isFinite(value) && value > 0;
    }).length;

  return {
    pe_ratio: count("pe_ratio"),
    ev_revenue: count("ev_revenue"),
    ev_ebitda: count("ev_ebitda"),
  };
}
