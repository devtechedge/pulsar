"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Server,
  MapPin,
  Gauge,
  Activity,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Power,
  Zap,
  Cpu,
  Award,
  DollarSign,
  Wifi,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  genAddress,
  mulberry32,
  genJobId,
} from "@/lib/mock-data";
import { formatCompact, truncateAddress } from "@/lib/format";

// ---------------------------------------------------------------------------
// Local deterministic helpers (absolute-jitter variants of mock-data helpers)
// ---------------------------------------------------------------------------

/** Walk prev by ±jitter (absolute), then clamp to [min, max]. */
function clampWalk(prev: number, jitter: number, min: number, max: number): number {
  const next = prev + (Math.random() - 0.5) * 2 * jitter;
  return Number(Math.max(min, Math.min(max, next)).toFixed(2));
}

/** Build a {i,v}[] sparkline of `points` values starting at `base`, ±`jitter` each step. */
function makeSpark(seed: number, points: number, base: number, jitter: number): { i: number; v: number }[] {
  const rng = mulberry32(seed);
  const out: { i: number; v: number }[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    v = Math.max(0, v + (rng() - 0.5) * 2 * jitter);
    out.push({ i, v: Number(v.toFixed(2)) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// GPU catalog
// ---------------------------------------------------------------------------

interface GpuSpec {
  id: string;
  label: string;
  tflops: number; // single-precision FP32 TFLOPS
  vramGb: number;
  suggestedPulPerHr: number;
}

const GPUS: GpuSpec[] = [
  { id: "4090", label: "RTX 4090 (24GB)", tflops: 82.6, vramGb: 24, suggestedPulPerHr: 18 },
  { id: "4090x2", label: "RTX 4090 ×2", tflops: 165.2, vramGb: 48, suggestedPulPerHr: 36 },
  { id: "a100", label: "A100 80GB", tflops: 312, vramGb: 80, suggestedPulPerHr: 64 },
  { id: "h100", label: "H100 80GB", tflops: 989, vramGb: 80, suggestedPulPerHr: 142 },
  { id: "h100x4", label: "H100 ×4", tflops: 3956, vramGb: 320, suggestedPulPerHr: 540 },
  { id: "custom", label: "Custom cluster", tflops: 2500, vramGb: 200, suggestedPulPerHr: 380 },
];

const REGIONS = ["US-East", "US-West", "EU-Central", "Asia-Pacific", "LatAm"] as const;
type Region = (typeof REGIONS)[number];

// Region demand multipliers affect suggested earnings
const REGION_MULT: Record<Region, number> = {
  "US-East": 1.05,
  "US-West": 1.0,
  "EU-Central": 1.08,
  "Asia-Pacific": 0.95,
  LatAm: 0.85,
};

// ---------------------------------------------------------------------------
// Live network stats (deterministic initial values, random walk in effect)
// ---------------------------------------------------------------------------

interface NetStat {
  key: string;
  label: string;
  value: number;
  fmt: (v: number) => string;
  spark: { i: number; v: number }[];
  jitter: number;
  min: number;
  max: number;
}

const initialStats: NetStat[] = [
  {
    key: "nodes",
    label: "Active nodes",
    value: 1247,
    fmt: (v) => formatCompact(Math.round(v)),
    spark: makeSpark(101, 20, 1240, 12),
    jitter: 4,
    min: 1180,
    max: 1320,
  },
  {
    key: "tflops",
    label: "Total TFLOPS",
    value: 89400,
    fmt: (v) => `${(v / 1000).toFixed(1)} PFLOPS`,
    spark: makeSpark(202, 20, 88000, 1800),
    jitter: 600,
    min: 82000,
    max: 96000,
  },
  {
    key: "jobs",
    label: "Active jobs",
    value: 342,
    fmt: (v) => Math.round(v).toString(),
    spark: makeSpark(303, 20, 340, 18),
    jitter: 10,
    min: 250,
    max: 460,
  },
  {
    key: "util",
    label: "Avg utilization",
    value: 73,
    fmt: (v) => `${v.toFixed(1)}%`,
    spark: makeSpark(404, 20, 72, 4),
    jitter: 1.2,
    min: 60,
    max: 90,
  },
  {
    key: "rate",
    label: "Avg $PULSAR / hr",
    value: 84.5,
    fmt: (v) => v.toFixed(2),
    spark: makeSpark(505, 20, 82, 4),
    jitter: 1.8,
    min: 60,
    max: 110,
  },
];

// Top suppliers (seeded, deterministic)
const TOP_SUPPLIERS = Array.from({ length: 5 }).map((_, i) => {
  const rng = mulberry32(9000 + i);
  const gpu = GPUS[Math.floor(rng() * GPUS.length)];
  return {
    rank: i + 1,
    address: genAddress(mulberry32(9000 + i)),
    gpuLabel: gpu.label,
    tflops: gpu.tflops,
    earnedToday: Math.round((40 + rng() * 380) * 10) / 10,
  };
});

// ---------------------------------------------------------------------------
// Registration step state
// ---------------------------------------------------------------------------

const REG_STEPS = ["Submitting on-chain", "Verified", "Node online"] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatTile({ stat }: { stat: NetStat }) {
  return (
    <div className="glass glass-hover rounded-xl p-3.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          {stat.label}
        </span>
        <Activity className="size-3 text-pulsar-cyan/70" />
      </div>
      <div className="font-display text-xl font-bold tabular-nums text-foreground">
        {stat.fmt(stat.value)}
      </div>
      <div className="mt-2 h-7">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stat.spark}>
            <defs>
              <linearGradient id={`spark-${stat.key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <Line
              type="monotone"
              dataKey="v"
              stroke={`url(#spark-${stat.key})`}
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EarningsKpi({ label, value, accent }: { label: string; value: string; accent?: "violet" | "cyan" }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display text-lg font-bold tabular-nums ${
          accent === "violet" ? "text-pulsar" : accent === "cyan" ? "text-pulsar-cyan" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SupplierRegistry() {
  const { toast } = useToast();

  const [gpuId, setGpuId] = useState<string>("4090");
  const [region, setRegion] = useState<Region>("US-East");
  const [uptime, setUptime] = useState<number>(95);
  const [ratePul, setRatePul] = useState<string>("");

  const [regStep, setRegStep] = useState<number>(-1); // -1 idle, 0..2 steps
  const [registered, setRegistered] = useState<{
    nodeId: string;
    operator: `0x${string}`;
    gpu: GpuSpec;
    region: Region;
    uptime: number;
    rate: number;
    startedAt: number;
  } | null>(null);

  const [stats, setStats] = useState<NetStat[]>(initialStats);
  const regTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const gpu = useMemo<GpuSpec>(
    () => GPUS.find((g) => g.id === gpuId) ?? GPUS[0],
    [gpuId]
  );

  // Auto-suggest rate when GPU changes (and user hasn't overridden)
  useEffect(() => {
    setRatePul(gpu.suggestedPulPerHr.toString());
  }, [gpu]);

  // Live network stats random walk every 2s
  useEffect(() => {
    const id = setInterval(() => {
      setStats((prev) =>
        prev.map((s) => {
          const next = clampWalk(s.value, s.jitter, s.min, s.max);
          const nextSpark = [...s.spark.slice(1), { i: s.spark[s.spark.length - 1].i + 1, v: Number(next.toFixed(2)) }];
          return { ...s, value: Number(next.toFixed(2)), spark: nextSpark };
        })
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Cleanup registration timers on unmount
  useEffect(() => {
    return () => regTimers.current.forEach(clearTimeout);
  }, []);

  const rateNum = Number(ratePul) || 0;
  const utilizationFactor = Math.min(0.95, Math.max(0.4, uptime / 100 * 0.95));
  const regionMult = REGION_MULT[region];

  // Projected earnings — animated count-up via state in render-effect
  const projected = useMemo(() => {
    const grossPerHr = rateNum * utilizationFactor * regionMult;
    const netPerHr = grossPerHr * 0.99; // 1% protocol fee
    return {
      hourly: netPerHr,
      daily: netPerHr * 24,
      weekly: netPerHr * 24 * 7,
      monthly: netPerHr * 24 * 30,
      annual: netPerHr * 24 * 365,
    };
  }, [rateNum, utilizationFactor, regionMult]);

  // Animated count-up for "monthly" headline
  const [animatedMonthly, setAnimatedMonthly] = useState<number>(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = projected.monthly;
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedMonthly(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [projected.monthly]);

  function handleRegister() {
    if (regStep >= 0) return;
    if (rateNum <= 0) {
      toast({
        title: "Set your $PULSAR hourly rate",
        description: "Pick a positive hourly rate to register your node.",
        variant: "destructive",
      });
      return;
    }
    setRegStep(0);
    regTimers.current = [];
    regTimers.current.push(setTimeout(() => setRegStep(1), 1000));
    regTimers.current.push(setTimeout(() => setRegStep(2), 2100));
    regTimers.current.push(
      setTimeout(() => {
        const seed = Date.now();
        setRegistered({
          nodeId: genJobId("node"),
          operator: genAddress(mulberry32(seed + 1)),
          gpu,
          region,
          uptime,
          rate: rateNum,
          startedAt: Date.now(),
        });
        setRegStep(-1);
        toast({
          title: "Node online",
          description: `Node ${genJobId("node")} is now serving compute on Pulsar.`,
        });
      }, 3300)
    );
  }

  function handleStop() {
    setRegistered(null);
    toast({
      title: "Node stopped",
      description: "Your node has been deregistered from the supplier pool.",
    });
  }

  return (
    <section
      id="suppliers"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <SectionHeading
        eyebrow="Supplier Registry"
        title="Supply GPU power, earn $PULSAR"
        subtitle="Become a node operator on the Pulsar compute network."
      />

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base"
      >
        Node operators stake $PULSAR as collateral and earn rewards proportional
        to their verified compute contributions. Pricing is set by the network
        oracle based on GPU class, region, and demand. The more you supply, the
        more you earn — minus a 1% protocol fee that funds the buyback-and-burn.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-12 grid gap-6 lg:grid-cols-2"
      >
        {/* ---------------- REGISTRATION FORM (LEFT) ---------------- */}
        <div className="glass glass-hover rounded-2xl p-5 md:p-7">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-pulsar-violet/15 text-pulsar-violet ring-1 ring-pulsar-violet/30">
              <Server className="size-4.5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Register your node</h3>
              <p className="text-[11px] text-muted-foreground">Configure hardware &amp; pricing</p>
            </div>
          </div>

          {/* GPU */}
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            GPU model
          </label>
          <Select value={gpuId} onValueChange={setGpuId} disabled={!!registered || regStep >= 0}>
            <SelectTrigger className="h-10 w-full bg-white/5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GPUS.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  <div className="flex w-full items-center justify-between gap-3">
                    <span>{g.label}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {g.tflops} TFLOPS
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
              <div className="text-muted-foreground">TFLOPS</div>
              <div className="font-mono font-semibold text-foreground">
                {gpu.tflops.toLocaleString()}
              </div>
            </div>
            <div className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
              <div className="text-muted-foreground">VRAM</div>
              <div className="font-mono font-semibold text-foreground">{gpu.vramGb} GB</div>
            </div>
            <div className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
              <div className="text-muted-foreground">Suggested</div>
              <div className="font-mono font-semibold text-pulsar-cyan">
                {gpu.suggestedPulPerHr} PUL/hr
              </div>
            </div>
          </div>

          {/* Region */}
          <label className="mb-1.5 mt-5 block text-xs font-medium text-muted-foreground">
            <MapPin className="mr-1 inline size-3.5" /> Region
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={!!registered || regStep >= 0}
                onClick={() => setRegion(r)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                  region === r
                    ? "border-pulsar-violet/50 bg-pulsar-violet/15 text-foreground"
                    : "border-white/8 bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Uptime */}
          <div className="mb-1.5 mt-5 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Wifi className="size-3.5" /> Uptime commitment
            </label>
            <span className="font-mono text-xs text-foreground">{uptime}%</span>
          </div>
          <Slider
            value={[uptime]}
            min={50}
            max={99}
            step={1}
            onValueChange={(v) => setUptime(v[0])}
            disabled={!!registered || regStep >= 0}
            className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-pulsar-violet [&_[data-slot=slider-range]]:to-pulsar-cyan [&_[data-slot=slider-thumb]]:border-pulsar-violet"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Higher uptime commitment → higher routing priority and projected earnings.
          </p>

          {/* Hourly rate */}
          <label className="mb-1.5 mt-5 block text-xs font-medium text-muted-foreground">
            <DollarSign className="mr-1 inline size-3.5" /> $PULSAR hourly rate
          </label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={ratePul}
              onChange={(e) => setRatePul(e.target.value)}
              disabled={!!registered || regStep >= 0}
              className="h-10 bg-white/5 pr-12 font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
              PUL/hr
            </span>
          </div>

          {/* Action button or registration stepper */}
          <AnimatePresence mode="wait">
            {!registered && regStep < 0 && (
              <motion.div
                key="register-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  type="button"
                  onClick={handleRegister}
                  className="mt-5 h-12 w-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient text-base font-semibold text-white transition-transform hover:scale-[1.01]"
                >
                  <Power className="size-4" /> Register node
                </Button>
              </motion.div>
            )}

            {!registered && regStep >= 0 && (
              <motion.div
                key="register-steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-5 rounded-xl border border-pulsar-violet/30 bg-pulsar-violet/[0.06] p-4"
              >
                {REG_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2.5 py-1">
                    {regStep > i ? (
                      <CheckCircle2 className="size-4 text-emerald-300" />
                    ) : regStep === i ? (
                      <Loader2 className="size-4 animate-spin text-pulsar" />
                    ) : (
                      <div className="size-4 rounded-full border border-white/15" />
                    )}
                    <span
                      className={`text-sm ${
                        regStep > i
                          ? "text-foreground"
                          : regStep === i
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {s}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

            {registered && (
              <motion.div
                key="node-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04] p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="size-3.5" /> Node online
                  </span>
                  <Badge className="border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0 text-[9px] text-emerald-300">
                    serving
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Node ID</dt>
                    <dd className="font-semibold text-foreground">{registered.nodeId}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Operator</dt>
                    <dd className="font-semibold text-foreground">
                      {truncateAddress(registered.operator)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">GPU</dt>
                    <dd className="font-semibold text-foreground">{registered.gpu.label}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Region</dt>
                    <dd className="font-semibold text-foreground">{registered.region}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Rate</dt>
                    <dd className="font-semibold text-pulsar-cyan">
                      {registered.rate} PUL/hr
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Uptime</dt>
                    <dd className="font-semibold text-foreground">{registered.uptime}%</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleStop}
                  className="mt-3 h-9 w-full border border-rose-400/30 bg-rose-400/10 text-xs font-semibold text-rose-300 hover:bg-rose-400/15"
                >
                  <Power className="size-3.5" /> Stop node
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------------- EARNINGS + NETWORK STATS (RIGHT) ---------------- */}
        <div className="flex flex-col gap-6">
          {/* Projected earnings */}
          <div className="glass glass-hover rounded-2xl p-5 md:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-pulsar-cyan/15 text-pulsar-cyan ring-1 ring-pulsar-cyan/30">
                  <TrendingUp className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Projected earnings</h3>
                  <p className="text-[11px] text-muted-foreground">
                    net of 1% protocol fee
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-white/8 bg-gradient-to-br from-pulsar-violet/[0.08] to-pulsar-cyan/[0.05] p-4">
              <div className="text-[11px] text-muted-foreground">Monthly estimate</div>
              <div className="mt-1 flex items-baseline gap-2">
                <motion.span
                  key={animatedMonthly.toFixed(0)}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  className="font-display text-3xl font-bold tabular-nums text-gradient"
                >
                  {formatCompact(animatedMonthly)}
                </motion.span>
                <span className="font-mono text-sm text-muted-foreground">$PULSAR</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Zap className="size-3 text-pulsar-cyan" />
                Based on {gpu.label} · {region} · {uptime}% uptime · {rateNum} PUL/hr
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <EarningsKpi label="Hourly" value={`${projected.hourly.toFixed(2)}`} accent="violet" />
              <EarningsKpi label="Daily" value={`${projected.daily.toFixed(1)}`} accent="cyan" />
              <EarningsKpi label="Weekly" value={formatCompact(projected.weekly)} />
              <EarningsKpi label="Annual" value={formatCompact(projected.annual)} accent="violet" />
            </div>
          </div>

          {/* Live network stats */}
          <div className="glass glass-hover rounded-2xl p-5 md:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4.5 text-pulsar-violet" />
                <h3 className="font-display text-lg font-bold">Network stats</h3>
                <Badge className="border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0 text-[9px] text-emerald-300">
                  <span className="size-1 rounded-full bg-emerald-300" /> live
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {stats.map((s) => (
                <StatTile key={s.key} stat={s} />
              ))}
              <div className="glass glass-hover rounded-xl p-3.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Network demand
                  </span>
                  <Gauge className="size-3 text-pulsar-violet/70" />
                </div>
                <div className="font-display text-xl font-bold tabular-nums text-foreground">
                  {stats[2].value > 380 ? "High" : stats[2].value > 300 ? "Steady" : "Low"}
                </div>
                <div className="mt-2 h-7">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats[2].spark}>
                      <defs>
                        <linearGradient id="demand-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="#8B5CF6"
                        strokeWidth={1.4}
                        fill="url(#demand-grad)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ---------------- TOP SUPPLIERS LEADERBOARD ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 glass rounded-2xl p-5 md:p-7"
      >
        <div className="mb-4 flex items-center gap-2">
          <Award className="size-4.5 text-amber-300" />
          <h3 className="font-display text-lg font-bold">Top suppliers — today</h3>
          <span className="text-xs text-muted-foreground">by $PULSAR earned</span>
        </div>
        <div className="grid gap-2.5">
          {TOP_SUPPLIERS.map((s) => (
            <motion.div
              key={s.address}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3"
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${
                  s.rank === 1
                    ? "bg-amber-400/20 text-amber-300"
                    : s.rank === 2
                      ? "bg-slate-300/15 text-slate-200"
                      : s.rank === 3
                        ? "bg-orange-400/15 text-orange-300"
                        : "bg-white/5 text-muted-foreground"
                }`}
              >
                {s.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {truncateAddress(s.address)}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {s.gpuLabel}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Cpu className="size-3" /> {s.tflops.toLocaleString()} TFLOPS
                  </span>
                  <span className="sm:hidden">{s.gpuLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-pulsar-cyan">
                  +{s.earnedToday.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">$PULSAR today</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
