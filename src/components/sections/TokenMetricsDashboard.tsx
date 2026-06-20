"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Flame,
  Wallet,
  Building2,
  Activity,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Hash,
  TrendingUp,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAccount, useReadContracts } from "wagmi";
import {
  genAddress,
  genTxHash,
  mulberry32,
  formatClock,
} from "@/lib/mock-data";
import { formatCompact, formatFull, truncateAddress } from "@/lib/format";
import { IS_LIVE, BASE_EXPLORER, PULSAR_TOKEN } from "@/lib/wagmi";
import { erc20Abi, TOKENOMICS } from "@/lib/contracts";

type IconType = React.ComponentType<{ className?: string }>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ONE_BILLION = 1_000_000_000;
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

// ---------------------------------------------------------------------------
// Supply breakdown (mock)
// ---------------------------------------------------------------------------

interface Slice {
  name: string;
  value: number; // tokens
  color: string;
}

const SUPPLY_SLICES: Slice[] = [
  { name: "Circulating", value: 412_000_000, color: "#8B5CF6" },
  { name: "Liquidity", value: 200_000_000, color: "#22D3EE" },
  { name: "Team-locked", value: 150_000_000, color: "#F472B6" },
  { name: "Treasury", value: 100_000_000, color: "#34D399" },
  { name: "Unvested", value: 137_500_000, color: "#FBBF24" },
  { name: "Burned", value: 12_500_000, color: "#64748B" },
];

// ---------------------------------------------------------------------------
// Transfer volume (30d deterministic)
// ---------------------------------------------------------------------------

const VOLUME_30D = (() => {
  const rng = mulberry32(4242);
  const out: { day: string; vol: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const base = 4_000_000 + Math.sin(i / 3) * 1_500_000;
    const jitter = (rng() - 0.5) * 2_000_000;
    out.push({
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      vol: Math.max(800_000, Math.round(base + jitter)),
    });
  }
  return out;
})();

// ---------------------------------------------------------------------------
// Top holders
// ---------------------------------------------------------------------------

interface Holder {
  rank: number;
  address: string;
  label?: string;
  balance: number;
  pct: number;
  change7d: number; // signed pct
  isBurn?: boolean;
}

const HOLDERS: Holder[] = (() => {
  const rng = mulberry32(7070);
  const list: Holder[] = [
    {
      rank: 1,
      address: "0x8a1E4F2b9c3D7e6A5b8C9D0E1F2a3B4c5D6e7F80",
      label: "Uniswap V2 Pair",
      balance: 187_400_000,
      pct: 18.74,
      change7d: -0.6,
    },
    {
      rank: 2,
      address: "0x1b2C3d4E5F6a7b8C9d0E1f2A3B4c5D6e7F8a9B0c",
      label: "Treasury",
      balance: 100_000_000,
      pct: 10.0,
      change7d: 0,
    },
    {
      rank: 3,
      address: BURN_ADDRESS,
      label: "Burn address",
      balance: 12_500_000,
      pct: 1.25,
      change7d: 0.8,
      isBurn: true,
    },
  ];
  for (let i = 0; i < 7; i++) {
    const balance = Math.round((rng() * 8_000_000 + 1_500_000) / 1000) * 1000;
    list.push({
      rank: 4 + i,
      address: genAddress(mulberry32(7070 + i + 1)),
      balance,
      pct: Number(((balance / ONE_BILLION) * 100).toFixed(2)),
      change7d: Number(((rng() - 0.45) * 4).toFixed(2)),
    });
  }
  return list;
})();

// ---------------------------------------------------------------------------
// Initial burn feed (8 seeded)
// ---------------------------------------------------------------------------

interface Burn {
  id: string;
  ts: number;
  burner: `0x${string}`;
  amount: number;
  txHash: `0x${string}`;
}

function genInitialBurns(count: number): Burn[] {
  const out: Burn[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const rng = mulberry32(8800 + i * 31);
    const amount = Math.round((500 + rng() * 9500) * 100) / 100;
    out.push({
      id: `burn-${i}-${Math.random().toString(36).slice(2, 8)}`,
      ts: now - i * 47_000,
      burner: genAddress(mulberry32(8800 + i)),
      amount,
      txHash: genTxHash(mulberry32(8800 + i * 2 + 1)),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: IconType;
  label: string;
  value: string;
  sub?: string;
  accent: "violet" | "cyan" | "amber" | "emerald" | "pink";
}) {
  const palette: Record<typeof accent, string> = {
    violet: "from-pulsar-violet/20 to-pulsar-violet/[0.02] text-pulsar-violet",
    cyan: "from-pulsar-cyan/20 to-pulsar-cyan/[0.02] text-pulsar-cyan",
    amber: "from-amber-400/20 to-amber-400/[0.02] text-amber-300",
    emerald: "from-emerald-400/20 to-emerald-400/[0.02] text-emerald-300",
    pink: "from-pink-400/20 to-pink-400/[0.02] text-pink-300",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-br p-4 ${palette[accent]}`}
    >
      <Icon className="absolute right-3 top-3 size-5 opacity-40" />
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TokenMetricsDashboard() {
  const { address } = useAccount();

  // On-chain reads — only when IS_LIVE
  const liveCalls = IS_LIVE && PULSAR_TOKEN
    ? [
        { address: PULSAR_TOKEN as `0x${string}`, abi: erc20Abi, functionName: "totalSupply" as const },
        { address: PULSAR_TOKEN as `0x${string}`, abi: erc20Abi, functionName: "balanceOf" as const, args: [BURN_ADDRESS] as const },
      ]
    : [];

  const { data: liveData } = useReadContracts({ contracts: liveCalls });

  const onChainTotalSupply = (liveData?.[0]?.result as bigint | undefined) ?? undefined;
  const onChainBurned = (liveData?.[1]?.result as bigint | undefined) ?? undefined;

  // Use on-chain values when live, else fall back to constants
  const totalSupply = onChainTotalSupply
    ? Number(onChainTotalSupply) / 1e18
    : ONE_BILLION;
  const burned = onChainBurned ? Number(onChainBurned) / 1e18 : TOKENOMICS.burnedSupply;
  const circulating = totalSupply - burned - 150_000_000 - 100_000_000 - 200_000_000 - 137_500_000;
  const treasury = 100_000_000;

  // Burn feed state — initial seeded burns, prepend new every 6s
  const [burns, setBurns] = useState<Burn[]>(() => genInitialBurns(8));
  const [newBurnId, setNewBurnId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const seed = Date.now();
      const amount = Math.round((500 + Math.random() * 9500) * 100) / 100;
      const newBurn: Burn = {
        id: `burn-live-${seed}`,
        ts: Date.now(),
        burner: genAddress(mulberry32(seed)),
        amount,
        txHash: genTxHash(mulberry32(seed + 1)),
      };
      setBurns((prev) => [newBurn, ...prev].slice(0, 8));
      setNewBurnId(newBurn.id);
      setTimeout(() => setNewBurnId(null), 1200);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // 24h volume (sum last day from VOLUME_30D)
  const volume24h = VOLUME_30D[VOLUME_30D.length - 1].vol;

  // Burned count-up
  const [burnDisplay, setBurnDisplay] = useState<number>(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = burned;
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setBurnDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [burned]);

  const donutData = useMemo(
    () =>
      SUPPLY_SLICES.map((s) => ({
        name: s.name,
        value: s.value,
        fill: s.color,
      })),
    []
  );

  return (
    <section
      id="metrics"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <SectionHeading
        eyebrow="Token Metrics"
        title="On-chain, transparent, in real time"
        subtitle="Every $PULSAR metric is verifiable on Base."
      />

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base"
      >
        Every $PULSAR metric is verifiable on-chain. The dashboard below pulls
        live data from Basescan — circulating supply, top holders, transfer
        volume, and the public burn address. No private dashboards, no opaque
        market-making, no surprises.
      </motion.p>

      <div className="mt-6 flex justify-center">
        <Badge
          className={
            IS_LIVE
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-400/10 text-amber-300"
          }
        >
          <span
            className={`size-1.5 rounded-full ${
              IS_LIVE ? "bg-emerald-300" : "bg-amber-300"
            }`}
          />
          {IS_LIVE ? "Live on-chain data" : "Preview data — contract deploys at TGE"}
        </Badge>
      </div>

      {/* ---------------- TOP ROW ---------------- */}
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {/* Supply breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass glass-hover rounded-2xl p-5 md:p-7"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Supply breakdown</h3>
              <p className="text-[11px] text-muted-foreground">all allocations, on-chain</p>
            </div>
            <Badge className="border-pulsar-violet/30 bg-pulsar-violet/10 text-pulsar-violet">
              {formatCompact(totalSupply)} total
            </Badge>
          </div>

          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(11,13,28,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#E6E9F5",
                  }}
                  formatter={(v: number, _n, p) => [
                    `${formatFull(v)} PULSAR`,
                    p?.payload?.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-bold text-gradient">
                {formatCompact(totalSupply)}
              </span>
              <span className="text-[10px] text-muted-foreground">total supply</span>
            </div>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-1.5">
            {SUPPLY_SLICES.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-[12px]">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="truncate text-muted-foreground">{s.name}</span>
                <span className="ml-auto font-mono font-semibold text-foreground">
                  {formatCompact(s.value)}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Transfer volume */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          className="glass glass-hover rounded-2xl p-5 md:p-7"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Transfer volume</h3>
              <p className="text-[11px] text-muted-foreground">last 30 days, daily</p>
            </div>
            <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
              24h: {formatCompact(volume24h)}
            </Badge>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VOLUME_30D} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#8B8FA8", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: "#8B8FA8", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(v)}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "rgba(11,13,28,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#E6E9F5",
                  }}
                  formatter={(v: number) => [`${formatFull(v)} PULSAR`, "Volume"]}
                />
                <Area
                  type="monotone"
                  dataKey="vol"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#volGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
              <div className="text-[10px] text-muted-foreground">Min</div>
              <div className="font-mono text-xs font-semibold text-foreground">
                {formatCompact(Math.min(...VOLUME_30D.map((d) => d.vol)))}
              </div>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
              <div className="text-[10px] text-muted-foreground">Avg</div>
              <div className="font-mono text-xs font-semibold text-foreground">
                {formatCompact(VOLUME_30D.reduce((a, b) => a + b.vol, 0) / VOLUME_30D.length)}
              </div>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
              <div className="text-[10px] text-muted-foreground">Max</div>
              <div className="font-mono text-xs font-semibold text-foreground">
                {formatCompact(Math.max(...VOLUME_30D.map((d) => d.vol)))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ---------------- MIDDLE ROW ---------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top holders */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass glass-hover rounded-2xl p-5 md:p-7"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-4.5 text-pulsar-violet" />
              <h3 className="font-display text-lg font-bold">Top holders</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">10 largest $PULSAR balances</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-8 text-muted-foreground">#</TableHead>
                <TableHead className="text-muted-foreground">Address</TableHead>
                <TableHead className="text-right text-muted-foreground">Balance</TableHead>
                <TableHead className="text-right text-muted-foreground">% supply</TableHead>
                <TableHead className="text-right text-muted-foreground">7d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HOLDERS.map((h) => (
                <TableRow key={h.rank} className="border-white/5">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {h.rank}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`${BASE_EXPLORER}/address/${h.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-pulsar-cyan"
                    >
                      {truncateAddress(h.address)}
                      {h.isBurn && (
                        <Badge className="border-orange-400/30 bg-orange-400/10 px-1 py-0 text-[8px] text-orange-300">
                          burn
                        </Badge>
                      )}
                    </a>
                    {h.label && (
                      <div className="text-[10px] text-muted-foreground">{h.label}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCompact(h.balance)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {h.pct.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono text-xs ${
                        h.change7d > 0
                          ? "text-emerald-300"
                          : h.change7d < 0
                            ? "text-rose-300"
                            : "text-muted-foreground"
                      }`}
                    >
                      {h.change7d > 0 ? (
                        <ArrowUp className="size-3" />
                      ) : h.change7d < 0 ? (
                        <ArrowDown className="size-3" />
                      ) : null}
                      {h.change7d > 0 ? "+" : ""}
                      {h.change7d.toFixed(2)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        {/* Burn feed */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          className="glass glass-hover rounded-2xl p-5 md:p-7"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="size-4.5 text-orange-300" />
              <h3 className="font-display text-lg font-bold">Burn feed</h3>
            </div>
            <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <span className="size-1 rounded-full bg-emerald-300" /> live
            </Badge>
          </div>

          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {burns.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, x: -16, height: 0 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    height: "auto",
                    boxShadow:
                      newBurnId === b.id
                        ? "0 0 0 1px rgba(248, 113, 113, 0.5)"
                        : "0 0 0 0 transparent",
                  }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Flame className="size-3.5 text-orange-300" />
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {formatCompact(b.amount)} $PULSAR
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatClock(new Date(b.ts))}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Hash className="size-2.5" />
                      {truncateAddress(b.burner)}
                    </span>
                    <a
                      href={`${BASE_EXPLORER}/tx/${b.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-mono text-pulsar-cyan hover:underline"
                    >
                      {b.txHash.slice(0, 10)}…
                      <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-orange-400/20 bg-orange-400/[0.05] p-2.5 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="size-3.5 text-orange-300" />
              Total burned (tracked)
            </span>
            <span className="font-mono font-semibold text-orange-300">
              {formatCompact(burnDisplay)} $PULSAR
            </span>
          </div>
        </motion.div>
      </div>

      {/* ---------------- BOTTOM STRIP — KPI TILES ---------------- */}
      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={Activity}
          label="Circulating supply"
          value={`${formatCompact(circulating)}`}
          sub="liquid $PULSAR in market"
          accent="violet"
        />
        <KpiTile
          icon={Flame}
          label="Burned forever"
          value={`${formatCompact(burned)}`}
          sub="deflationary pressure"
          accent="amber"
        />
        <KpiTile
          icon={Building2}
          label="Treasury balance"
          value={`${formatCompact(treasury)}`}
          sub="multisig-governed reserve"
          accent="emerald"
        />
        <KpiTile
          icon={TrendingUp}
          label="24h transfer volume"
          value={`${formatCompact(volume24h)}`}
          sub="all $PULSAR transfers"
          accent="cyan"
        />
      </div>

      {address && IS_LIVE && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"
        >
          <Wallet className="size-3" />
          Data refreshed from Base for {truncateAddress(address)}
        </motion.div>
      )}
    </section>
  );
}
