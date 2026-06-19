"use client";

import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Flame, BadgeCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { BurnedCounter } from "@/components/BurnedCounter";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TOKENOMICS } from "@/lib/contracts";
import { IS_LIVE, PULSAR_TOKEN, BASE_EXPLORER } from "@/lib/wagmi";
import { formatCompact, formatFull, resolveChartColor } from "@/lib/format";

// Estimated vesting duration (months) per allocation
const VESTING_MONTHS: Record<string, number> = {
  "Ecosystem & Compute Rewards": 36,
  Liquidity: 12,
  "Team & Advisors": 24,
  "Marketing & Partnerships": 18,
  "Treasury / DAO Reserve": 60,
  "Presale / Early Supporters": 6,
};

const TAX_ROWS = [
  { label: "Treasury", pct: 50, bps: "1.00%", color: "#8B5CF6" },
  { label: "Liquidity", pct: 25, bps: "0.50%", color: "#22D3EE" },
  { label: "Burn", pct: 25, bps: "0.50%", color: "#F472B6" },
];

const donutData = TOKENOMICS.allocations.map((a) => ({
  name: a.name,
  value: a.pct,
  fill: resolveChartColor(a.color),
  supply: a.supply,
}));

const barData = TOKENOMICS.allocations.map((a) => ({
  name: a.name.split(" ")[0],
  full: a.name,
  months: VESTING_MONTHS[a.name] ?? 12,
  fill: resolveChartColor(a.color),
}));

const burnedPct = ((TOKENOMICS.burnedSupply / TOKENOMICS.totalSupply) * 100).toFixed(2);

export function Tokenomics() {
  return (
    <section id="tokenomics" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="Tokenomics"
        title="Built to accrue value as usage grows"
        subtitle="Fixed supply. Tax funds treasury, liquidity, and burn. On-chain proof of every allocation."
      />

      {/* Charts */}
      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {/* Donut */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass rounded-2xl p-6 md:p-8"
        >
          <h3 className="font-display text-xl font-bold">Allocation</h3>
          <p className="mt-1 text-sm text-muted-foreground">1,000,000,000 $PULSAR total supply</p>

          <div className="relative mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={120}
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
                    `${v}% · ${formatFull(p?.payload?.supply ?? 0)} PULSAR`,
                    p?.payload?.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-gradient">1B</span>
              <span className="text-xs text-muted-foreground">total supply</span>
            </div>
          </div>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {TOKENOMICS.allocations.map((a) => (
              <li key={a.name} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: resolveChartColor(a.color) }}
                />
                <span className="text-muted-foreground truncate">{a.name}</span>
                <span className="ml-auto font-mono font-semibold text-foreground">{a.pct}%</span>
                <span className="font-mono text-xs text-muted-foreground">{formatCompact(a.supply)}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass rounded-2xl p-6 md:p-8"
        >
          <h3 className="font-display text-xl font-bold">Vesting schedule</h3>
          <p className="mt-1 text-sm text-muted-foreground">Estimated lock duration per allocation (months)</p>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#22D3EE" />
                  </linearGradient>
                </defs>
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
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "rgba(11,13,28,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#E6E9F5",
                  }}
                  formatter={(v: number, _n, p) => [`${v} months`, p?.payload?.full]}
                />
                <Bar dataKey="months" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* 3-card row */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Tax */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass glass-hover rounded-2xl p-6"
        >
          <h3 className="text-sm font-medium text-muted-foreground">Buy / Sell Tax</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-gradient">2%</span>
            <span className="font-display text-2xl font-bold text-muted-foreground">/</span>
            <span className="font-display text-4xl font-bold text-gradient">2%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Hard cap 5% / 5%</p>
          <div className="mt-5 space-y-3">
            {TAX_ROWS.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-mono font-semibold text-foreground">{r.bps}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${r.pct}%`, background: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Burned */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass glass-hover relative rounded-2xl p-6"
        >
          <Flame className="absolute right-5 top-5 size-5 text-orange-400/80" />
          <h3 className="text-sm font-medium text-muted-foreground">Burned forever</h3>
          <div className="mt-3">
            <BurnedCounter />
            <span className="ml-2 font-mono text-sm text-muted-foreground">$PULSAR</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            ~{burnedPct}% of total supply removed from circulation.
          </p>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Burns come from the protocol fee share and will scale with network
            usage. Every burn is verifiable on-chain.
          </p>
        </motion.div>

        {/* Contract */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass glass-hover rounded-2xl p-6"
        >
          <h3 className="text-sm font-medium text-muted-foreground">Contract</h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-2xl font-bold">$PULSAR</span>
            {IS_LIVE ? (
              <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <BadgeCheck className="size-3" /> Verified
              </Badge>
            ) : (
              <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300">Pending</Badge>
            )}
          </div>

          {IS_LIVE ? (
            <>
              <p className="mt-4 break-all font-mono text-xs text-muted-foreground leading-relaxed">
                {PULSAR_TOKEN}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <CopyButton value={PULSAR_TOKEN} label="Copy contract address" />
                <Link
                  href={`${BASE_EXPLORER}/address/${PULSAR_TOKEN}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-pulsar-cyan hover:underline"
                >
                  View on Basescan
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Contract deploys at TGE. Address + verification will be published
              here and across all official channels at launch.
            </p>
          )}
        </motion.div>
      </div>

      {/* Vesting table */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        className="mt-6 glass rounded-2xl p-4 md:p-6"
      >
        <h3 className="mb-4 px-2 font-display text-lg font-bold">Vesting schedule</h3>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Allocation</TableHead>
              <TableHead className="text-right text-muted-foreground">%</TableHead>
              <TableHead className="text-right text-muted-foreground">Supply</TableHead>
              <TableHead className="text-muted-foreground">Vesting</TableHead>
              <TableHead className="text-right text-muted-foreground">Lock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TOKENOMICS.allocations.map((a) => (
              <TableRow key={a.name} className="border-white/5">
                <TableCell className="font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: resolveChartColor(a.color) }}
                    />
                    {a.name}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">{a.pct}%</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatFull(a.supply)}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.vesting}</TableCell>
                <TableCell className="text-right">
                  {a.locked ? (
                    <Badge className="border-pulsar-violet/30 bg-pulsar-violet/10 text-pulsar-violet">Locked</Badge>
                  ) : (
                    <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">Streaming</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </section>
  );
}
