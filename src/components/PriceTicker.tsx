"use client";

import { TrendingUp } from "lucide-react";
import { IS_LIVE } from "@/lib/wagmi";

/**
 * Live-ish price ticker. When IS_LIVE is false (pre-launch) it shows a
 * "deploying soon" pill. When live, it shows a mocked spot price + 24h delta.
 * Wire to a real price feed (Uniswap pair) in a later task.
 */
export function PriceTicker() {
  if (!IS_LIVE) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 font-mono text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
        Pre-launch · Contract deploying soon
      </div>
    );
  }

  const price = 0.0042;
  const delta = 3.4;
  const positive = delta >= 0;

  return (
    <div className="inline-flex items-center gap-3 rounded-full glass px-4 py-2 font-mono text-xs">
      <span className="text-foreground font-semibold">$PULSAR</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-foreground">${price.toFixed(4)}</span>
      <span
        className={
          positive
            ? "inline-flex items-center gap-1 text-emerald-400"
            : "inline-flex items-center gap-1 text-rose-400"
        }
      >
        <TrendingUp className="size-3" />
        {positive ? "+" : ""}
        {delta.toFixed(1)}% 24h
      </span>
    </div>
  );
}
