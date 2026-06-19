/**
 * Formatting helpers for Pulsar UI.
 */

import { formatUnits as viemFormatUnits } from "viem";

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const full = new Intl.NumberFormat("en-US", {
  grouping: true,
});

/** Compact number, e.g. 1.2B, 350M, 12.5M. */
export function formatCompact(n: number | bigint): string {
  if (typeof n === "bigint") return compact.format(Number(n));
  return compact.format(n);
}

/** Full grouped number, e.g. 1,000,000,000. */
export function formatFull(n: number | bigint): string {
  if (typeof n === "bigint") return full.format(Number(n));
  return full.format(n);
}

/** Truncate an Ethereum address: 0x1234…abcd. */
export function truncateAddress(addr: string, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= 2 + chars * 2) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

export { viemFormatUnits as formatUnits };

/** Resolve chart palette `var(--chart-x)` references to concrete hex colors. */
export function resolveChartColor(color: string): string {
  switch (color) {
    case "var(--chart-1)":
      return "#8B5CF6";
    case "var(--chart-2)":
      return "#22D3EE";
    case "var(--chart-3)":
      return "#F472B6";
    case "var(--chart-4)":
      return "#FBBF24";
    case "var(--chart-5)":
      return "#34D399";
    default:
      return color;
  }
}

/** Format a unix-seconds timestamp as a localized date. */
export function formatPeriodFinish(unixSeconds: bigint): string {
  if (!unixSeconds || unixSeconds === 0n) return "—";
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
