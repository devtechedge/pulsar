"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  Type,
  Image as ImageIcon,
  Mic,
  Eye,
  Code2,
  Boxes,
  Calculator,
  Lock,
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
  DollarSign,
  ExternalLink,
  Activity,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { mulberry32 } from "@/lib/mock-data";
import { formatCompact } from "@/lib/format";

type IconType = React.ComponentType<{ className?: string }>;

/** Walk prev by ±range (absolute), then clamp to [min, max]. */
function clampWalk(prev: number, range: number, min: number, max: number): number {
  const next = prev + (Math.random() - 0.5) * 2 * range;
  return Math.max(min, Math.min(max, Number(next.toFixed(4))));
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PULSAR_USD = 0.0042; // 1 $PULSAR ≈ $0.0042
const PROTOCOL_FEE_PCT = 0.01; // 1% network fee

// ---------------------------------------------------------------------------
// Workload catalog
// ---------------------------------------------------------------------------

type WorkloadKind = "text" | "image" | "voice" | "vision" | "code" | "embed";

interface WorkloadMeta {
  id: WorkloadKind;
  label: string;
  icon: IconType;
  unit: string;
  defaultCount: number;
  step: number;
  min: number;
  max: number;
  ratePulPerUnit: number; // base $PULSAR per 1 unit (no tier)
  tiers?: { id: string; label: string; mult: number }[];
  extraLabel?: string;
  extraOptions?: { id: string; label: string; mult: number }[];
}

const WORKLOADS: WorkloadMeta[] = [
  {
    id: "text",
    label: "Text (LLM)",
    icon: Type,
    unit: "tokens",
    defaultCount: 1_000_000,
    step: 100_000,
    min: 100_000,
    max: 50_000_000,
    ratePulPerUnit: 0.000_000_8, // per token
    tiers: [
      { id: "small", label: "Small (7B)", mult: 0.5 },
      { id: "large", label: "Large (70B)", mult: 1.0 },
      { id: "frontier", label: "Frontier (405B)", mult: 2.4 },
    ],
  },
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    unit: "images",
    defaultCount: 100,
    step: 10,
    min: 1,
    max: 5000,
    ratePulPerUnit: 1.8,
    extraLabel: "Resolution",
    extraOptions: [
      { id: "512", label: "512 × 512", mult: 0.5 },
      { id: "1024", label: "1024 × 1024", mult: 1.0 },
      { id: "2048", label: "2048 × 2048", mult: 2.2 },
    ],
  },
  {
    id: "voice",
    label: "Voice",
    icon: Mic,
    unit: "minutes",
    defaultCount: 60,
    step: 5,
    min: 1,
    max: 1000,
    ratePulPerUnit: 0.6,
    tiers: [
      { id: "whisper", label: "Whisper v3", mult: 1.0 },
      { id: "xtts", label: "XTTS v2", mult: 1.3 },
      { id: "bark", label: "Bark", mult: 1.6 },
    ],
  },
  {
    id: "vision",
    label: "Vision",
    icon: Eye,
    unit: "images to analyze",
    defaultCount: 50,
    step: 5,
    min: 1,
    max: 2000,
    ratePulPerUnit: 0.9,
    extraLabel: "Model",
    extraOptions: [
      { id: "llava", label: "LLaVA 1.6", mult: 1.0 },
      { id: "qwen-vl", label: "Qwen-VL Max", mult: 1.4 },
    ],
  },
  {
    id: "code",
    label: "Code",
    icon: Code2,
    unit: "lines",
    defaultCount: 1000,
    step: 100,
    min: 50,
    max: 50_000,
    ratePulPerUnit: 0.0004,
    tiers: [
      { id: "small", label: "DeepSeek Coder 7B", mult: 0.5 },
      { id: "large", label: "DeepSeek Coder 33B", mult: 1.1 },
    ],
  },
  {
    id: "embed",
    label: "Embeddings",
    icon: Boxes,
    unit: "documents",
    defaultCount: 1000,
    step: 100,
    min: 50,
    max: 100_000,
    ratePulPerUnit: 0.000_08,
  },
];

// ---------------------------------------------------------------------------
// 24h price history for the live network pricing chart
// Deterministic, generated once with mulberry32
// ---------------------------------------------------------------------------

const PRICE_24H = (() => {
  const rng = mulberry32(98765);
  const out: { t: string; v: number }[] = [];
  let v = 0.82; // $PULSAR per 1M tokens baseline
  for (let h = 23; h >= 0; h--) {
    v = Math.max(0.5, Math.min(1.3, v + (rng() - 0.5) * 0.08));
    const d = new Date();
    d.setHours(d.getHours() - h);
    out.push({
      t: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      v: Number(v.toFixed(4)),
    });
  }
  return out;
})();

// ---------------------------------------------------------------------------
// Comparison table data — centralized providers (USD per workload unit)
// Prices are roughly competitive with public list rates as of late 2024.
// ---------------------------------------------------------------------------

const COMPARISON = [
  { provider: "Pulsar", color: "#8B5CF6", isPulsar: true },
  { provider: "AWS Bedrock", color: "#FBBF24", isPulsar: false },
  { provider: "RunPod", color: "#34D399", isPulsar: false },
  { provider: "Together AI", color: "#22D3EE", isPulsar: false },
  { provider: "Replicate", color: "#F472B6", isPulsar: false },
];

// Multiplier vs Pulsar baseline (so Pulsar is always 60-80% cheaper)
const COMP_MULT: Record<string, number> = {
  Pulsar: 1.0,
  "AWS Bedrock": 3.6,
  RunPod: 2.7,
  "Together AI": 2.9,
  Replicate: 3.2,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RatePill({ direction, pct }: { direction: "up" | "down" | "flat"; pct: number }) {
  if (direction === "flat") {
    return (
      <Badge className="border-white/15 bg-white/5 text-muted-foreground">
        <Minus className="size-3" /> {pct.toFixed(2)}%
      </Badge>
    );
  }
  return (
    <Badge
      className={
        direction === "down"
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-rose-400/30 bg-rose-400/10 text-rose-300"
      }
    >
      {direction === "down" ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
      {pct.toFixed(2)}%
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PricingOracle() {
  const { toast } = useToast();
  const [active, setActive] = useState<WorkloadKind>("text");

  const meta = useMemo<WorkloadMeta>(
    () => WORKLOADS.find((w) => w.id === active) ?? WORKLOADS[0],
    [active]
  );

  const [count, setCount] = useState<number>(meta.defaultCount);
  const [tierId, setTierId] = useState<string>(meta.tiers?.[1]?.id ?? meta.tiers?.[0]?.id ?? "");
  const [extraId, setExtraId] = useState<string>(meta.extraOptions?.[1]?.id ?? meta.extraOptions?.[0]?.id ?? "");
  const [lastActive, setLastActive] = useState<WorkloadKind>(active);

  // Adjust state when the workload tab changes (React-recommended pattern —
  // avoid setState inside useEffect for derived prop changes).
  if (active !== lastActive) {
    setLastActive(active);
    const nextMeta = WORKLOADS.find((w) => w.id === active) ?? WORKLOADS[0];
    setCount(nextMeta.defaultCount);
    setTierId(nextMeta.tiers?.[1]?.id ?? nextMeta.tiers?.[0]?.id ?? "");
    setExtraId(nextMeta.extraOptions?.[1]?.id ?? nextMeta.extraOptions?.[0]?.id ?? "");
  }

  // Live rate random walk (±5%) — interval ticks every 3s; resets on tab switch
  const baseRate = meta.ratePulPerUnit;
  const [liveMult, setLiveMult] = useState<number>(1.0);
  const [prevMult, setPrevMult] = useState<number>(1.0);

  useEffect(() => {
    const id = setInterval(() => {
      setPrevMult((prev) => {
        const next = clampWalk(prev, 0.025, 0.95, 1.05);
        setLiveMult(next);
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [active]);

  const tierMult = meta.tiers?.find((t) => t.id === tierId)?.mult ?? 1;
  const extraMult = meta.extraOptions?.find((o) => o.id === extraId)?.mult ?? 1;
  const effectiveRate = baseRate * tierMult * extraMult * liveMult;

  const subtotal = effectiveRate * count;
  const fee = subtotal * PROTOCOL_FEE_PCT;
  const total = subtotal + fee;
  const totalUsd = total * PULSAR_USD;

  const rateDirection: "up" | "down" | "flat" =
    liveMult > prevMult + 0.0001 ? "up" : liveMult < prevMult - 0.0001 ? "down" : "flat";
  const ratePct = ((liveMult - 1) * 100);

  // Live chart state — append new point every 3s to mirror live rate
  const [chartData, setChartData] = useState(PRICE_24H);
  useEffect(() => {
    const id = setInterval(() => {
      setChartData((prev) => {
        const last = prev[prev.length - 1].v;
        const next = Number(clampWalk(last, 0.04, 0.5, 1.3).toFixed(4));
        const now = new Date();
        const newPoint = {
          t: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          v: next,
        };
        return [...prev.slice(-23), newPoint];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Chart min/max/avg
  const stats = useMemo(() => {
    const vals = chartData.map((d) => d.v);
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    };
  }, [chartData]);

  // Comparison table calculations
  const comparisonRows = COMPARISON.map((c) => {
    const costUsd = totalUsd * COMP_MULT[c.provider];
    const savings = c.isPulsar ? 0 : ((costUsd - totalUsd) / costUsd) * 100;
    return {
      ...c,
      costPul: c.isPulsar ? total : (costUsd / PULSAR_USD),
      costUsd,
      savings,
    };
  });

  function handleLockRate() {
    toast({
      title: "Rate locked! (simulated)",
      description: `Your quote of ${total.toFixed(4)} $PULSAR for ${formatCompact(count)} ${meta.unit} is reserved for 60s.`,
    });
  }

  return (
    <section
      id="oracle"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <SectionHeading
        eyebrow="Pricing Oracle"
        title="Transparent compute pricing, live"
        subtitle="See how much $PULSAR a job costs — compared against the cloud."
      />

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base"
      >
        Pulsar&apos;s compute oracle sets prices dynamically based on GPU supply
        and demand across the network. Quotes are transparent, on-chain, and
        update in real time. Below is a live preview of pricing across common AI
        workloads — compared against centralized alternatives.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-12"
      >
        {/* Workload tabs */}
        <Tabs value={active} onValueChange={(v) => setActive(v as WorkloadKind)}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="flex h-auto w-max min-w-full flex-wrap justify-start gap-1 bg-white/[0.03] p-1">
              {WORKLOADS.map((w) => (
                <TabsTrigger
                  key={w.id}
                  value={w.id}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs"
                >
                  <w.icon className="size-3.5" />
                  {w.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            {/* LEFT — workload form */}
            <div className="glass glass-hover rounded-2xl p-5 md:p-7">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-pulsar-violet/15 text-pulsar-violet ring-1 ring-pulsar-violet/30">
                  <meta.icon className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">{meta.label} workload</h3>
                  <p className="text-[11px] text-muted-foreground">Specify the size of your job</p>
                </div>
              </div>

              {WORKLOADS.map((w) => (
                <TabsContent key={w.id} value={w.id} className="space-y-5 focus-visible:outline-none">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      How many {w.unit}?
                    </label>
                    <Input
                      type="number"
                      min={w.min}
                      max={w.max}
                      step={w.step}
                      value={count}
                      onChange={(e) => setCount(Math.max(w.min, Math.min(w.max, Number(e.target.value) || w.min)))}
                      className="h-11 bg-white/5 font-mono text-base"
                    />
                    <input
                      type="range"
                      min={w.min}
                      max={Math.min(w.max, w.id === "text" ? 10_000_000 : w.max)}
                      step={w.step}
                      value={Math.min(count, w.id === "text" ? 10_000_000 : w.max)}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="mt-3 w-full accent-pulsar-violet"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>{formatCompact(w.min)}</span>
                      <span>{formatCompact(w.max)}</span>
                    </div>
                  </div>

                  {w.tiers && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Model tier
                      </label>
                      <Select value={tierId} onValueChange={setTierId}>
                        <SelectTrigger className="h-10 w-full bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {w.tiers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex w-full items-center justify-between gap-3">
                                <span>{t.label}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  ×{t.mult}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {w.extraOptions && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        {w.extraLabel}
                      </label>
                      <Select value={extraId} onValueChange={setExtraId}>
                        <SelectTrigger className="h-10 w-full bg-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {w.extraOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              <div className="flex w-full items-center justify-between gap-3">
                                <span>{o.label}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  ×{o.mult}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Base rate (per {w.unit === "tokens" ? "1M tokens" : w.unit})</span>
                      <span className="font-mono font-semibold text-foreground">
                        {w.unit === "tokens"
                          ? `${(effectiveRate * 1_000_000).toFixed(4)} PUL`
                          : `${effectiveRate.toFixed(4)} PUL`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span>Network fee (1%)</span>
                      <span className="font-mono font-semibold text-foreground">
                        {fee.toFixed(4)} PUL
                      </span>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </div>

            {/* RIGHT — live cost card */}
            <div className="glass glass-hover flex flex-col rounded-2xl p-5 md:p-7">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-pulsar-cyan/15 text-pulsar-cyan ring-1 ring-pulsar-cyan/30">
                    <Calculator className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">Live cost</h3>
                    <p className="text-[11px] text-muted-foreground">updates every 3s</p>
                  </div>
                </div>
                <RatePill direction={rateDirection} pct={ratePct} />
              </div>

              <div className="rounded-xl border border-pulsar-violet/30 bg-gradient-to-br from-pulsar-violet/[0.10] to-pulsar-cyan/[0.05] p-5">
                <div className="text-[11px] text-muted-foreground">Total cost</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <motion.span
                    key={total.toFixed(4)}
                    initial={{ opacity: 0.5, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="font-display text-4xl font-bold tabular-nums text-gradient"
                  >
                    {total.toFixed(4)}
                  </motion.span>
                  <span className="font-mono text-sm text-muted-foreground">$PULSAR</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <DollarSign className="size-3 text-emerald-300" />
                  ≈ ${totalUsd.toFixed(4)} USD
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 font-mono text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Base rate</dt>
                  <dd className="font-semibold text-foreground">
                    {effectiveRate.toFixed(6)} PUL / {meta.unit}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">× Units</dt>
                  <dd className="font-semibold text-foreground">
                    {formatCompact(count)} {meta.unit}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-semibold text-foreground">{subtotal.toFixed(4)} PUL</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Network fee (1%)</dt>
                  <dd className="font-semibold text-foreground">{fee.toFixed(4)} PUL</dd>
                </div>
                <div className="flex justify-between border-t border-white/8 pt-1.5">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-bold text-pulsar-cyan">{total.toFixed(4)} PUL</dd>
                </div>
              </dl>

              <Button
                type="button"
                onClick={handleLockRate}
                className="mt-5 h-11 w-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
              >
                <Lock className="size-4" /> Lock in this rate
              </Button>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Locked quotes valid for 60s · settles on-chain
              </p>
            </div>
          </div>
        </Tabs>
      </motion.div>

      {/* ---------------- COMPARISON TABLE ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 glass rounded-2xl p-5 md:p-7"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-4.5 text-pulsar-cyan" />
            <h3 className="font-display text-lg font-bold">Cost comparison</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            same workload · {formatCompact(count)} {meta.unit}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Provider</th>
                <th className="py-2 pr-3 text-right font-medium">$PULSAR cost</th>
                <th className="py-2 pr-3 text-right font-medium">USD cost</th>
                <th className="py-2 text-right font-medium">Savings vs Pulsar</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((r) => (
                <tr
                  key={r.provider}
                  className={`border-b border-white/5 ${
                    r.isPulsar ? "bg-pulsar-violet/[0.07]" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: r.color }}
                      />
                      <span className={`font-semibold ${r.isPulsar ? "text-pulsar" : "text-foreground"}`}>
                        {r.provider}
                      </span>
                      {r.isPulsar && (
                        <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 px-1.5 py-0 text-[9px] text-pulsar-cyan">
                          base
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono">
                    {r.isPulsar ? (
                      <span className="font-bold text-pulsar-cyan">{r.costPul.toFixed(4)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono">
                    ${r.costUsd.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right">
                    {r.isPulsar ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 font-mono font-semibold text-emerald-300">
                        <TrendingDown className="size-3" />
                        Pulsar {r.savings.toFixed(0)}% cheaper
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ---------------- LIVE NETWORK PRICING CHART ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 glass glass-hover rounded-2xl p-5 md:p-7"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4.5 text-pulsar-violet" />
            <div>
              <h3 className="font-display text-lg font-bold">Live network pricing</h3>
              <p className="text-[11px] text-muted-foreground">$PULSAR per 1M tokens — last 24h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <span className="size-1 rounded-full bg-emerald-300" /> live
            </Badge>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: "#8B8FA8", fontSize: 10 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: "#8B8FA8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0.4, 1.4]}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                contentStyle={{
                  background: "rgba(11,13,28,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#E6E9F5",
                }}
                formatter={(v: number) => [`${v.toFixed(4)} PUL`, "per 1M tokens"]}
              />
              <ReferenceLine
                y={stats.avg}
                stroke="#FBBF24"
                strokeDasharray="4 4"
                label={{
                  value: `avg ${stats.avg.toFixed(3)}`,
                  fill: "#FBBF24",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <ReferenceLine
                y={stats.min}
                stroke="#34D399"
                strokeDasharray="2 4"
                label={{ value: `min ${stats.min.toFixed(3)}`, fill: "#34D399", fontSize: 10, position: "insideBottomRight" }}
              />
              <ReferenceLine
                y={stats.max}
                stroke="#F87171"
                strokeDasharray="2 4"
                label={{ value: `max ${stats.max.toFixed(3)}`, fill: "#F87171", fontSize: 10, position: "insideTopRight" }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="url(#priceGrad)"
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-emerald-300">
              <TrendingDown className="size-3" /> 24h low
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
              {stats.min.toFixed(4)} PUL
            </div>
          </div>
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-amber-300">
              <Minus className="size-3" /> 24h avg
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
              {stats.avg.toFixed(4)} PUL
            </div>
          </div>
          <div className="rounded-lg border border-rose-400/20 bg-rose-400/[0.04] p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-rose-300">
              <TrendingUp className="size-3" /> 24h high
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
              {stats.max.toFixed(4)} PUL
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ExternalLink className="size-3" />
            Pricing oracle contract: PulsarPriceOracle.sol
          </span>
          <span>Updated every block (~2s on Base)</span>
        </div>
      </motion.div>
    </section>
  );
}
