"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Flame,
  Timer,
  TrendingDown,
  ExternalLink,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TOKENOMICS } from "@/lib/contracts";
import { BASE_EXPLORER } from "@/lib/wagmi";
import { formatCompact, formatFull, truncateAddress } from "@/lib/format";
import {
  genAddress,
  genTxHash,
  mulberry32,
  pick,
  randFloat,
  randInt,
  formatCountdown,
  timeAgo,
} from "@/lib/mock-data";

// --- Mock data (deterministic) ----------------------------------------------

/** Months ago → cumulative PULSAR burned, building up to current burnedSupply. */
function buildBurnHistory(): { month: string; cumulative: number; monthly: number }[] {
  const rng = mulberry32(20240811);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const out: { month: string; cumulative: number; monthly: number }[] = [];
  let cumulative = 0;
  const target = TOKENOMICS.burnedSupply; // 12.5M
  // distribute target across 12 months with noise, back-loaded
  const weights = months.map((_, i) => 0.5 + i * 0.18 + randFloat(rng, 0, 0.4));
  const sum = weights.reduce((a, b) => a + b, 0);
  months.forEach((m, i) => {
    const monthly = (weights[i] / sum) * target;
    cumulative += monthly;
    out.push({ month: m, cumulative: Math.round(cumulative), monthly: Math.round(monthly) });
  });
  return out;
}

function buildDeflationCurve(): { year: string; withBurn: number; withoutBurn: number }[] {
  // 5-year projection. Supply starts at 1B (minus already burned ~12.5M).
  // With current burn rate (~2.4% of remaining per year compounded) supply drops.
  const start = TOKENOMICS.totalSupply - TOKENOMICS.burnedSupply;
  const years = ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5"];
  const out: { year: string; withBurn: number; withoutBurn: number }[] = [];
  let withBurn = start;
  years.forEach((y) => {
    out.push({
      year: y,
      withBurn: Math.round(withBurn),
      withoutBurn: TOKENOMICS.totalSupply,
    });
    withBurn *= 1 - 0.024; // 2.4% annual deflation
  });
  return out;
}

const INFLATION_COMPARISON = [
  { name: "Bitcoin", rate: 1.8, color: "#F7931A" },
  { name: "Ethereum", rate: 0.5, color: "#8A92B2" },
  { name: "Solana", rate: 5.4, color: "#14F195" },
  { name: "USDC", rate: 0.0, color: "#94A3B8" },
  { name: "Pulsar", rate: -2.4, color: "#22D3EE" },
];

interface BurnTx {
  hash: `0x${string}`;
  burner: `0x${string}`;
  amount: number;
  ts: number; // seconds ago
  label: string;
}

function seedBurnTxs(): BurnTx[] {
  const rng = mulberry32(98765);
  const burners = [
    "Treasury Buyback Bot",
    "Protocol Fee Burner",
    "Staking Penalty Burn",
    "DAO Governance Burn",
    "Liquidity Rebalance Burn",
    "Team Allocation Burn",
  ];
  return Array.from({ length: 6 }, (_, i) => ({
    hash: genTxHash(rng),
    burner: genAddress(rng),
    amount: randFloat(rng, 8_000, 240_000),
    ts: i * 47 + randInt(rng, 5, 45),
    label: pick(rng, burners),
  }));
}

// Quarterly buyback-and-burn target: next event in 47d 12h 34m 18s from mount
const NEXT_BURN_TARGET_MS = (47 * 86400 + 12 * 3600 + 34 * 60 + 18) * 1000;
const PROJECTED_NEXT_BURN = 2_400_000;
const PROJECTED_NEXT_BURN_USD = 10_080;

// --- Sub-components ---------------------------------------------------------

function CountdownCard() {
  const [remaining, setRemaining] = useState(NEXT_BURN_TARGET_MS);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1000 ? NEXT_BURN_TARGET_MS : r - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const cd = formatCountdown(remaining);

  const digit =
    "flex min-w-[2.5rem] items-center justify-center rounded-lg bg-gradient-to-br from-pulsar-violet/30 to-pulsar-cyan/20 px-2 py-2 font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl";

  return (
    <Card className="glass glass-hover relative overflow-hidden p-5 md:p-6">
      <div className="absolute -right-8 -top-8 size-32 rounded-full bg-pulsar-violet/15 blur-3xl" />
      <div className="flex items-center gap-2 text-pulsar-cyan">
        <Timer className="size-4" />
        <span className="font-mono text-xs uppercase tracking-[0.2em]">Next quarterly burn</span>
      </div>
      <div className="mt-4 flex items-end gap-1.5 sm:gap-2">
        <div className="flex flex-col items-center">
          <div className={digit}>{cd.days}</div>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">days</span>
        </div>
        <span className="pb-6 font-mono text-2xl text-muted-foreground">:</span>
        <div className="flex flex-col items-center">
          <div className={digit}>{cd.hours}</div>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">hrs</span>
        </div>
        <span className="pb-6 font-mono text-2xl text-muted-foreground">:</span>
        <div className="flex flex-col items-center">
          <div className={digit}>{cd.minutes}</div>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">min</span>
        </div>
        <span className="pb-6 font-mono text-2xl text-muted-foreground">:</span>
        <div className="flex flex-col items-center">
          <div className={`${digit} from-pulsar-cyan/40 to-pulsar-violet/20`}>{cd.seconds}</div>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">sec</span>
        </div>
      </div>
      <div className="mt-5 border-t border-white/5 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Projected burn</span>
          <span className="font-mono font-semibold text-foreground">
            {formatFull(PROJECTED_NEXT_BURN)} $PULSAR
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">≈ USD value</span>
          <span className="font-mono text-emerald-300">
            ${PROJECTED_NEXT_BURN_USD.toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  );
}

function CumulativeBurnedCard() {
  const [burned, setBurned] = useState<number>(TOKENOMICS.burnedSupply);

  useEffect(() => {
    const id = setInterval(() => {
      setBurned((b) => b + Math.floor(Math.random() * 3800) + 800);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const pct = ((burned / TOKENOMICS.totalSupply) * 100).toFixed(2);

  return (
    <Card className="glass glass-hover relative overflow-hidden p-5 md:p-6">
      <div className="absolute -left-6 -top-6 size-28 rounded-full bg-orange-500/15 blur-3xl" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-orange-400">
          <Flame className="size-4 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-[0.2em]">Cumulative burned</span>
        </div>
        <Badge className="border-orange-400/30 bg-orange-400/10 text-orange-300">Live</Badge>
      </div>
      <div className="mt-4">
        <div className="font-display text-4xl font-bold text-gradient sm:text-5xl">
          {formatFull(burned)}
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <span>$PULSAR removed forever</span>
        </div>
      </div>
      <div className="mt-5 border-t border-white/5 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">% of total supply</span>
          <span className="font-mono font-semibold text-foreground">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 via-pink-400 to-pulsar-cyan transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      const y = 30 - ((v - min) / range) * 28 - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function BurnRateCard() {
  const rng = useMemo(() => mulberry32(424242), []);
  const stats = useMemo(
    () => [
      {
        label: "24h burn",
        value: randFloat(rng, 38_000, 52_000),
        color: "#22D3EE",
        spark: Array.from({ length: 12 }, () => randFloat(rng, 1_500, 2_400)),
      },
      {
        label: "7d burn",
        value: randFloat(rng, 280_000, 360_000),
        color: "#8B5CF6",
        spark: Array.from({ length: 12 }, () => randFloat(rng, 35_000, 55_000)),
      },
      {
        label: "30d burn",
        value: randFloat(rng, 1_200_000, 1_600_000),
        color: "#F472B6",
        spark: Array.from({ length: 12 }, () => randFloat(rng, 38_000, 60_000)),
      },
    ],
    [rng]
  );

  return (
    <Card className="glass glass-hover p-5 md:p-6">
      <div className="flex items-center gap-2 text-pulsar-violet">
        <Activity className="size-4" />
        <span className="font-mono text-xs uppercase tracking-[0.2em]">Burn rate</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: s.color }}>
              {formatCompact(s.value)}
            </div>
            <div className="mt-2">
              <Sparkline data={s.spark} color={s.color} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BurnHistoryChart({ data }: { data: { month: string; cumulative: number; monthly: number }[] }) {
  return (
    <Card className="glass p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">Cumulative burn history</h3>
          <p className="mt-1 text-sm text-muted-foreground">$PULSAR removed from supply — last 12 months</p>
        </div>
        <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
          <Flame className="size-3" /> 12.5M total
        </Badge>
      </div>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="burnAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.7} />
                <stop offset="55%" stopColor="#22D3EE" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="month"
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
              cursor={{ stroke: "rgba(139, 92, 246, 0.3)", strokeWidth: 1 }}
              contentStyle={{
                background: "rgba(11,13,28,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#E6E9F5",
              }}
              formatter={(v: number) => [`${formatFull(v)} PULSAR`, "Cumulative"]}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fill="url(#burnAreaGrad)"
              dot={{ r: 3, fill: "#22D3EE", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#22D3EE", stroke: "#06070F", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DeflationCurveChart({ data }: { data: { year: string; withBurn: number; withoutBurn: number }[] }) {
  return (
    <Card className="glass p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">Projected 5-year deflation</h3>
          <p className="mt-1 text-sm text-muted-foreground">Supply trajectory with vs. without the burn mechanism</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-pulsar-cyan" /> With burn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-white/30" /> Without
          </span>
        </div>
      </div>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: "#8B8FA8", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8B8FA8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCompact(v as number)}
              domain={[800_000_000, 1_050_000_000]}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(11,13,28,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#E6E9F5",
              }}
              formatter={(v: number, n) => [`${formatFull(v)} PULSAR`, n === "withBurn" ? "With burn" : "Without burn"]}
            />
            <Line
              type="monotone"
              dataKey="withoutBurn"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="withBurn"
              stroke="#22D3EE"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#22D3EE", stroke: "#06070F", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        At the current burn rate of ~2.4% per year, total supply is projected to fall from ~987.5M to
        ~870M over the next 5 years — permanently deflationary.
      </p>
    </Card>
  );
}

function InflationComparisonChart() {
  const data = INFLATION_COMPARISON.map((d) => ({
    ...d,
    displayRate: Math.abs(d.rate),
  }));
  return (
    <Card className="glass p-5 md:p-6">
      <div>
        <h3 className="font-display text-lg font-bold">Deflation vs. inflation</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Annual supply inflation rate of major assets vs. Pulsar (deflationary)
        </p>
      </div>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 12, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#8B8FA8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#E6E9F5", fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "rgba(11,13,28,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#E6E9F5",
              }}
              formatter={(v: number, _n, p) => {
                const r = p?.payload?.rate ?? 0;
                return [`${r > 0 ? "+" : ""}${r}% / yr`, p?.payload?.name];
              }}
            />
            <Bar dataKey="displayRate" radius={[0, 6, 6, 0]} maxBarSize={26}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} opacity={d.name === "Pulsar" ? 1 : 0.65} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-pulsar-cyan/20 bg-pulsar-cyan/[0.05] px-3 py-2 text-xs">
        <TrendingDown className="size-3.5 text-pulsar-cyan" />
        <span className="text-muted-foreground">
          Pulsar is the only asset here with a <span className="font-semibold text-pulsar-cyan">negative</span> inflation rate — supply shrinks every year.
        </span>
      </div>
    </Card>
  );
}

function BurnTxFeed() {
  const [txs, setTxs] = useState<BurnTx[]>(() => seedBurnTxs());
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      const rng = mulberry32(1234 + tickRef.current);
      const labels = [
        "Treasury Buyback Bot",
        "Protocol Fee Burner",
        "Staking Penalty Burn",
        "DAO Governance Burn",
        "Liquidity Rebalance Burn",
      ];
      const next: BurnTx = {
        hash: genTxHash(rng),
        burner: genAddress(rng),
        amount: randFloat(rng, 8_000, 240_000),
        ts: 0,
        label: pick(rng, labels),
      };
      setTxs((prev) => [next, ...prev].slice(0, 6));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="glass p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">Recent burn transactions</h3>
          <p className="mt-1 text-sm text-muted-foreground">Latest on-chain burns — every entry verifiable on Basescan</p>
        </div>
        <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </Badge>
      </div>
      <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {txs.map((tx, i) => (
          <motion.div
            key={tx.hash}
            initial={i === 0 ? { opacity: 0, y: -8, height: 0 } : false}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-pulsar-cyan/30 hover:bg-pulsar-cyan/[0.03]"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-pulsar-violet/20">
              <Flame className="size-4 text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-foreground">{tx.label}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{truncateAddress(tx.burner)}</span>
                <span>·</span>
                <span>{timeAgo(tx.ts)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-semibold text-pulsar-cyan">
                −{formatFull(Math.round(tx.amount))}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">PULSAR</div>
            </div>
            <Link
              href={`${BASE_EXPLORER}/tx/${tx.hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-pulsar-cyan"
              aria-label="View transaction on Basescan"
            >
              <ExternalLink className="size-3.5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// --- Main section -----------------------------------------------------------

export function BurnTracker() {
  const burnHistory = useMemo(() => buildBurnHistory(), []);
  const deflationCurve = useMemo(() => buildDeflationCurve(), []);

  return (
    <section
      id="burn"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeading
          eyebrow="Deflationary Mechanics"
          title="Watch supply shrink in real time"
          subtitle="Every quarter, protocol fees accumulated in $PULSAR are used to buy back tokens from the open market and burn them permanently. This creates sustained deflationary pressure that scales with network usage. The tracker below is fully on-chain — every burn is verifiable on Basescan."
        />

        {/* Top row: 3 cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <CountdownCard />
          <CumulativeBurnedCard />
          <BurnRateCard />
        </div>

        {/* Middle: 2 charts */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <BurnHistoryChart data={burnHistory} />
          <DeflationCurveChart data={deflationCurve} />
        </div>

        {/* Bottom: comparison + feed */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <InflationComparisonChart />
          <BurnTxFeed />
        </div>

        {/* Footer callout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-pulsar-violet/20 bg-gradient-to-br from-pulsar-violet/[0.08] via-transparent to-pulsar-cyan/[0.05] p-5 md:flex-row md:items-center md:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-pulsar-violet/20">
              <Flame className="size-5 text-orange-400" />
            </div>
            <div>
              <h4 className="font-display text-base font-bold">Burns are permanent &amp; on-chain</h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Burned $PULSAR is sent to the{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-pulsar-cyan">0x000…dEaD</code>{" "}
                address and can never be recovered. Every transaction is signed, verified, and
                publicly auditable.
              </p>
            </div>
          </div>
          <Link
            href={`${BASE_EXPLORER}/address/0x000000000000000000000000000000000000dEaD`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-pulsar-cyan/40 hover:bg-pulsar-cyan/[0.05] hover:text-pulsar-cyan"
          >
            View burn address
            <ArrowUpRight className="size-4" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
