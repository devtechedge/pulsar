"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowLeftRight,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Zap,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCompact, formatFull, truncateAddress } from "@/lib/format";
import { genTxHash, mulberry32, prefersReducedMotion } from "@/lib/mock-data";
import { SOCIALS } from "@/lib/contracts";

// --- Chain metadata ---------------------------------------------------------

interface ChainMeta {
  id: string;
  name: string;
  short: string;
  color: string;
  color2: string;
  x: number; // SVG coord (600x400 viewBox)
  y: number;
  r: number;
  liquidity: number;
  volume24h: number;
  bridgers: number;
}

const CHAINS: ChainMeta[] = [
  {
    id: "base",
    name: "Base",
    short: "BASE",
    color: "#8B5CF6",
    color2: "#7C3AED",
    x: 300,
    y: 200,
    r: 46,
    liquidity: 48_200_000,
    volume24h: 2_840_000,
    bridgers: 8421,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    short: "ETH",
    color: "#C4B5FD",
    color2: "#E6E9F5",
    x: 80,
    y: 200,
    r: 34,
    liquidity: 22_400_000,
    volume24h: 1_120_000,
    bridgers: 3987,
  },
  {
    id: "optimism",
    name: "Optimism",
    short: "OP",
    color: "#FBBF24",
    color2: "#F472B6",
    x: 480,
    y: 78,
    r: 30,
    liquidity: 9_800_000,
    volume24h: 410_000,
    bridgers: 1542,
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    short: "ARB",
    color: "#22D3EE",
    color2: "#34D399",
    x: 500,
    y: 322,
    r: 30,
    liquidity: 14_600_000,
    volume24h: 690_000,
    bridgers: 2_104,
  },
  {
    id: "polygon",
    name: "Polygon",
    short: "MATIC",
    color: "#34D399",
    color2: "#22D3EE",
    x: 120,
    y: 338,
    r: 30,
    liquidity: 7_200_000,
    volume24h: 280_000,
    bridgers: 982,
  },
];

const CHAIN_BY_ID = Object.fromEntries(CHAINS.map((c) => [c.id, c])) as Record<string, ChainMeta>;

// --- Bridge progress steps --------------------------------------------------

interface BridgeStep {
  label: string;
  sub: string;
  icon: typeof Lock;
}

const BRIDGE_STEPS = (src: ChainMeta, dst: ChainMeta): BridgeStep[] => [
  { label: "Initiated", sub: `Bridge request from ${src.name}`, icon: Zap },
  { label: `Locked on ${src.name}`, sub: "Tokens escrowed in LayerZero endpoint", icon: Lock },
  { label: "Validating (LayerZero)", sub: "DVN signatures + message relayer", icon: ShieldCheck },
  { label: `Minted on ${dst.name}`, sub: "OFT received by destination contract", icon: CheckCircle2 },
];

// --- Cosmos map -------------------------------------------------------------

interface ActivePulse {
  id: number;
  from: string;
  to: string;
}

function CosmosMap({
  activePulse,
  onPulseComplete,
}: {
  activePulse: ActivePulse | null;
  onPulseComplete: () => void;
}) {
  const reduced = typeof window !== "undefined" ? prefersReducedMotion() : false;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 600 400"
        className="h-auto w-full"
        role="img"
        aria-label="Cross-chain bridge map: Base in the center connected to Ethereum, Optimism, Arbitrum, and Polygon"
      >
        <defs>
          <radialGradient id="bgNebula" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(124, 58, 237, 0.18)" />
            <stop offset="60%" stopColor="rgba(34, 211, 238, 0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {CHAINS.map((c) => (
            <radialGradient key={`grad-${c.id}`} id={`grad-${c.id}`} cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor={c.color2} stopOpacity={0.95} />
              <stop offset="60%" stopColor={c.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={c.color} stopOpacity={0.5} />
            </radialGradient>
          ))}
          <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* background nebula */}
        <rect x="0" y="0" width="600" height="400" fill="url(#bgNebula)" />

        {/* stars */}
        {Array.from({ length: 36 }).map((_, i) => {
          const rng = mulberry32(i + 7);
          const sx = rng() * 600;
          const sy = rng() * 400;
          const sr = rng() * 1.1 + 0.3;
          return (
            <circle
              key={`star-${i}`}
              cx={sx}
              cy={sy}
              r={sr}
              fill="white"
              opacity={0.18 + rng() * 0.4}
            />
          );
        })}

        {/* bridge paths from Base to each other chain */}
        {CHAINS.filter((c) => c.id !== "base").map((c) => {
          const base = CHAIN_BY_ID.base;
          const midX = (base.x + c.x) / 2;
          const midY = (base.y + c.y) / 2 - 22;
          const path = `M ${base.x} ${base.y} Q ${midX} ${midY} ${c.x} ${c.y}`;
          const pathId = `path-${c.id}`;

          // idle traveling dot — slow ambient pulse
          return (
            <g key={pathId}>
              <path
                d={path}
                fill="none"
                stroke="rgba(139, 92, 246, 0.35)"
                strokeWidth={1.5}
                strokeDasharray="3 5"
              />
              {!reduced && (
                <motion.circle
                  r={3}
                  fill={c.color}
                  filter="url(#planetGlow)"
                  initial={false}
                  animate={{
                    offsetDistance: ["0%", "100%"],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: CHAINS.indexOf(c) * 0.6,
                  }}
                  style={{
                    offsetPath: `path("${path}")`,
                  }}
                />
              )}
            </g>
          );
        })}

        {/* active bridge pulse */}
        <AnimatePresence>
          {activePulse && (
            <ActivePulseDot
              key={`pulse-${activePulse.id}`}
              from={activePulse.from}
              to={activePulse.to}
              onComplete={onPulseComplete}
            />
          )}
        </AnimatePresence>

        {/* chain planets */}
        {CHAINS.map((c) => (
          <g key={c.id} filter="url(#planetGlow)">
            <motion.circle
              cx={c.x}
              cy={c.y}
              r={c.r}
              fill={`url(#grad-${c.id})`}
              stroke={c.color}
              strokeWidth={1.5}
              strokeOpacity={0.6}
              initial={false}
              animate={reduced ? false : { scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: CHAINS.indexOf(c) * 0.4 }}
              style={{ transformOrigin: `${c.x}px ${c.y}px` }}
            />
            <text
              x={c.x}
              y={c.y + c.r + 18}
              textAnchor="middle"
              fontSize={c.id === "base" ? 13 : 11}
              fontWeight={700}
              fill="#E6E9F5"
              fontFamily="var(--font-display)"
            >
              {c.short}
            </text>
            {c.id === "base" && (
              <text
                x={c.x}
                y={c.y + 5}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#fff"
                opacity={0.9}
                fontFamily="var(--font-mono)"
              >
                ★
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* legend overlay */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1 rounded-lg border border-white/5 bg-cosmos/60 px-2.5 py-2 backdrop-blur-sm">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Chains</span>
        <div className="grid grid-cols-1 gap-1">
          {CHAINS.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
              <span className="size-2 rounded-full" style={{ background: c.color }} />
              <span className="text-foreground/80">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivePulseDot({
  from,
  to,
  onComplete,
}: {
  from: string;
  to: string;
  onComplete: () => void;
}) {
  const src = CHAIN_BY_ID[from];
  const dst = CHAIN_BY_ID[to];
  if (!src || !dst) return null;

  const midX = (src.x + dst.x) / 2;
  const midY = (src.y + dst.y) / 2 - 22;
  const path = `M ${src.x} ${src.y} Q ${midX} ${midY} ${dst.x} ${dst.y}`;

  return (
    <motion.circle
      r={6}
      fill="#22D3EE"
      filter="url(#planetGlow)"
      initial={{ offsetDistance: "0%", opacity: 0 }}
      animate={{
        offsetDistance: ["0%", "100%"],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1.2,
        ease: "easeInOut",
        times: [0, 0.1, 0.85, 1],
      }}
      style={{ offsetPath: `path("${path}")` }}
      onAnimationComplete={onComplete}
    />
  );
}

// --- Bridge form & progress -------------------------------------------------

interface Settlement {
  amount: number;
  fee: number;
  source: ChainMeta;
  dest: ChainMeta;
  txHash: `0x${string}`;
  etaMin: number;
  etaMax: number;
}

function BridgeForm({
  onBridge,
  disabled,
}: {
  onBridge: (src: string, dst: string, amount: string) => void;
  disabled: boolean;
}) {
  const [from, setFrom] = useState("base");
  const [to, setTo] = useState("ethereum");
  const [amount, setAmount] = useState("1000");

  const amountNum = Number(amount) || 0;
  const fee = amountNum * 0.001;
  const dst = CHAIN_BY_ID[to];
  const src = CHAIN_BY_ID[from];

  const swap = () => {
    if (to === from) return;
    const prevFrom = from;
    setFrom(to);
    setTo(prevFrom);
  };

  return (
    <Card className="glass p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Bridge $PULSAR</h3>
        <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
          <ArrowLeftRight className="size-3" /> LayerZero OFT
        </Badge>
      </div>

      <div className="space-y-3">
        {/* From */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From</span>
            <span className="text-xs text-muted-foreground">
              Balance: <span className="font-mono text-foreground">12,480</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="w-[140px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAINS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 font-mono text-right text-lg"
              min="0"
            />
          </div>
        </div>

        {/* swap button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-cosmos text-muted-foreground transition-colors hover:border-pulsar-cyan/40 hover:text-pulsar-cyan"
            aria-label="Swap source and destination"
          >
            <ArrowRight className="size-4 rotate-90" />
          </button>
        </div>

        {/* To */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">To</span>
            <span className="text-xs text-muted-foreground">
              Est. receive:{" "}
              <span className="font-mono text-pulsar-cyan">
                {(amountNum - fee).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="w-[140px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAINS.map((c) => (
                  <SelectItem key={c.id} value={c.id} disabled={c.id === from}>
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 rounded-md border border-white/5 bg-cosmos/40 px-3 py-2 text-right font-mono text-lg text-muted-foreground">
              {(amountNum - fee).toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* fee breakdown */}
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
          <span className="text-muted-foreground">Bridge fee (0.1%)</span>
          <span className="font-mono text-foreground">{fee.toLocaleString("en-US", { maximumFractionDigits: 2 })} PULSAR</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
          <span className="text-muted-foreground">Estimated time</span>
          <span className="font-mono text-foreground">3 – 7 min</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
          <span className="text-muted-foreground">Route</span>
          <span className="font-mono text-foreground">
            {src?.short} → {dst?.short}
          </span>
        </div>

        <Button
          onClick={() => onBridge(from, to, amount)}
          disabled={disabled || amountNum <= 0 || from === to}
          className="w-full bg-gradient-to-r from-pulsar-violet via-pulsar to-pulsar-cyan text-white shadow-lg shadow-pulsar-violet/20 transition-all hover:shadow-pulsar-violet/40"
        >
          {disabled ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Bridging…
            </>
          ) : (
            <>
              <ArrowLeftRight className="size-4" />
              Bridge $PULSAR
            </>
          )}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Simulated preview · real bridges settle via LayerZero DVNs
        </p>
      </div>
    </Card>
  );
}

function ProgressSteps({
  steps,
  current,
}: {
  steps: BridgeStep[];
  current: number; // -1 = not started
}) {
  return (
    <Card className="glass p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Settlement progress</h3>
        <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
          <Loader2 className="size-3 animate-spin" />
          Processing
        </Badge>
      </div>
      <ol className="relative space-y-4 pl-6">
        <span className="absolute left-[7px] top-1 bottom-1 w-px bg-white/10" />
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const pending = i > current;
          const Icon = step.icon;
          return (
            <li key={step.label} className="relative">
              <span
                className={`absolute -left-6 top-0.5 flex size-3.5 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-emerald-400 bg-emerald-400"
                    : active
                    ? "border-pulsar-cyan bg-pulsar-cyan"
                    : "border-white/20 bg-cosmos"
                }`}
              >
                {active && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-pulsar-cyan opacity-60" />
                )}
              </span>
              <div className="flex items-center gap-2">
                <Icon
                  className={`size-4 ${
                    done ? "text-emerald-400" : active ? "text-pulsar-cyan" : "text-muted-foreground"
                  } ${active ? "animate-pulse" : ""}`}
                />
                <span
                  className={`font-medium ${
                    pending ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.sub}</p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function SettlementReceipt({ s }: { s: Settlement }) {
  const rows = [
    { k: "Amount sent", v: `${formatFull(Math.round(s.amount))} $PULSAR` },
    { k: "Bridge fee (0.1%)", v: `${formatFull(Math.round(s.fee))} $PULSAR` },
    {
      k: "Amount received",
      v: `${formatFull(Math.round(s.amount - s.fee))} $PULSAR`,
    },
    { k: "Source chain", v: s.source.name },
    { k: "Destination chain", v: s.dest.name },
    { k: "Settlement time", v: `${s.etaMin} – ${s.etaMax} min` },
  ];

  return (
    <Card className="glass relative overflow-hidden p-5 md:p-6">
      <div className="absolute -right-10 -top-10 size-32 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Settlement receipt</h3>
        <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="size-3" /> Confirmed
        </Badge>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.k}
            className="flex items-center justify-between border-b border-white/5 pb-2 text-sm last:border-0"
          >
            <span className="text-muted-foreground">{r.k}</span>
            <span className="font-mono font-semibold text-foreground">{r.v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-b border-white/5 pb-2 text-sm last:border-0">
          <span className="text-muted-foreground">Transaction hash</span>
          <Link
            href={`https://basescan.org/tx/${s.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-pulsar-cyan hover:underline"
          >
            {truncateAddress(s.txHash)}
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

// --- Liquidity table + chart ------------------------------------------------

function LiquidityPanel({ chains }: { chains: ChainMeta[] }) {
  const [tick, setTick] = useState(0);

  // live-tick liquidity values slightly every 4s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const jitter = (n: number, i: number) => {
    const rng = mulberry32(i + tick * 17);
    const delta = (rng() - 0.5) * 0.012 * n; // ±0.6%
    return Math.max(0, n + delta);
  };

  const liveChains = chains.map((c, i) => ({
    ...c,
    liquidity: jitter(c.liquidity, i),
  }));

  const barData = liveChains.map((c) => ({
    name: c.short,
    liquidity: c.liquidity,
    fill: c.color,
  }));

  return (
    <Card className="glass p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">Per-chain liquidity</h3>
          <p className="mt-1 text-sm text-muted-foreground">$PULSAR liquidity bootstrapped on each chain by the protocol treasury</p>
        </div>
        <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </Badge>
      </div>

      {/* bar chart */}
      <div className="mt-5 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#8B8FA8", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8B8FA8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCompact(v as number)}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "rgba(11,13,28,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#E6E9F5",
              }}
              formatter={(v: number) => [`${formatFull(Math.round(v))} PULSAR`, "Liquidity"]}
            />
            <Bar dataKey="liquidity" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {barData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Chain</th>
              <th className="pb-2 pr-3 text-right font-medium">Liquidity</th>
              <th className="pb-2 pr-3 text-right font-medium">24h Volume</th>
              <th className="pb-2 text-right font-medium">Bridgers</th>
            </tr>
          </thead>
          <tbody>
            {liveChains.map((c) => (
              <tr key={c.id} className="border-b border-white/5 last:border-0">
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.id === "base" && (
                      <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan text-[10px]">
                        Home
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-foreground">
                  {formatFull(Math.round(c.liquidity))}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-muted-foreground">
                  {formatFull(c.volume24h)}
                </td>
                <td className="py-2.5 text-right font-mono text-muted-foreground">
                  {formatFull(c.bridgers)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Main section -----------------------------------------------------------

export function BridgeVisualizer() {
  const { toast } = useToast();
  const [activePulse, setActivePulse] = useState<ActivePulse | null>(null);
  const [phase, setPhase] = useState<"idle" | "bridging" | "settled">("idle");
  const [step, setStep] = useState(-1);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const pulseIdRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const srcId = "base";
  const dstId = "ethereum";
  const src = CHAIN_BY_ID[srcId];
  const dst = CHAIN_BY_ID[dstId];
  const steps = useMemo(() => BRIDGE_STEPS(src, dst), [src, dst]);

  // clear all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const handleBridge = (fromId: string, toId: string, amountStr: string) => {
    const amount = Number(amountStr) || 0;
    if (amount <= 0 || fromId === toId) {
      toast({
        title: "Cannot bridge",
        description: "Pick two different chains and enter an amount.",
      });
      return;
    }

    const fromChain = CHAIN_BY_ID[fromId];
    const toChain = CHAIN_BY_ID[toId];
    if (!fromChain || !toChain) return;

    // reset state
    setSettlement(null);
    setPhase("bridging");
    setStep(-1);
    pulseIdRef.current += 1;
    setActivePulse({ id: pulseIdRef.current, from: fromId, to: toId });

    const newSteps = BRIDGE_STEPS(fromChain, toChain);
    const stepDelay = 600;
    newSteps.forEach((_, i) => {
      const t = setTimeout(() => setStep(i), 200 + i * stepDelay);
      timersRef.current.push(t);
    });

    // trigger second pulse mid-bridge
    const t2 = setTimeout(() => {
      pulseIdRef.current += 1;
      setActivePulse({ id: pulseIdRef.current, from: fromId, to: toId });
    }, 900);
    timersRef.current.push(t2);

    const settleDelay = 200 + newSteps.length * stepDelay + 400;
    const t3 = setTimeout(() => {
      const rng = mulberry32(Date.now() & 0xffff);
      setSettlement({
        amount,
        fee: amount * 0.001,
        source: fromChain,
        dest: toChain,
        txHash: genTxHash(rng),
        etaMin: 3,
        etaMax: 7,
      });
      setPhase("settled");
      setActivePulse(null);
      toast({
        title: "Bridge complete",
        description: `${formatFull(Math.round(amount - amount * 0.001))} $PULSAR minted on ${toChain.name}.`,
      });
    }, settleDelay);
    timersRef.current.push(t3);
  };

  const handlePulseComplete = () => {
    // The active pulse's animation finished; the actual settlement is driven by timers.
  };

  return (
    <section
      id="bridge"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeading
          eyebrow="Cross-Chain"
          title="$PULSAR bridges to every major chain"
          subtitle="$PULSAR is natively on Base but will bridge to all major EVM chains via LayerZero. Liquidity is bootstrapped on each chain through the protocol treasury. The visualizer below shows the bridge in action — try it yourself."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          {/* Map + form column */}
          <div className="lg:col-span-3">
            <Card className="glass relative overflow-hidden p-3 md:p-4">
              <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                <Badge className="border-pulsar-violet/30 bg-pulsar-violet/10 text-pulsar-violet">
                  <Sparkles className="size-3" /> Cosmos map
                </Badge>
              </div>
              <CosmosMap activePulse={activePulse} onPulseComplete={handlePulseComplete} />
            </Card>

            <div className="mt-6">
              <LiquidityPanel chains={CHAINS} />
            </div>
          </div>

          {/* Right column: form / progress / receipt */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <BridgeForm onBridge={handleBridge} disabled={false} />
                </motion.div>
              )}
              {phase === "bridging" && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProgressSteps steps={steps} current={step} />
                </motion.div>
              )}
              {phase === "settled" && settlement && (
                <motion.div
                  key="receipt"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <SettlementReceipt s={settlement} />
                  <Button
                    onClick={() => {
                      setPhase("idle");
                      setStep(-1);
                      setSettlement(null);
                    }}
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 text-foreground hover:border-pulsar-cyan/40 hover:bg-pulsar-cyan/[0.05]"
                  >
                    Bridge again
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LayerZero badge */}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs">
              <ShieldCheck className="size-3.5 text-pulsar-cyan" />
              <span className="text-muted-foreground">
                Powered by{" "}
                <Link
                  href={SOCIALS.docs}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-pulsar-cyan hover:underline"
                >
                  LayerZero OFT standard
                </Link>{" "}
                · DVN-secured
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
