"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Lock,
  Unlock,
  Calendar,
  Gift,
  Clock,
  TrendingUp,
  Info,
  CheckCircle2,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip as UITip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { TOKENOMICS } from "@/lib/contracts";
import { formatCompact, formatFull, resolveChartColor } from "@/lib/format";

// --- Vesting model ----------------------------------------------------------

// Use a fixed reference "now" computed once on the client to avoid SSR/CSR
// hydration mismatch. On the server we render with TGE_DATE set such that
// the offset is exactly 14 months; on the client, useEffect recalculates.
const MS_PER_DAY = 86400000;
const MS_PER_MONTH = MS_PER_DAY * 30.44;

function monthsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_MONTH;
}

// Fixed TGE date — 14 months before a stable reference point.
// We use a hardcoded date so SSR and CSR produce identical output.
const TGE_DATE = new Date("2025-02-20T00:00:00Z");
const REFERENCE_NOW = new Date("2026-04-20T00:00:00Z"); // = TGE + ~14 months
const NOW_OFFSET_MONTHS = monthsBetween(TGE_DATE, REFERENCE_NOW); // ~14

interface VestAlloc {
  name: string;
  supply: number;
  color: string;
  tgePct: number; // % unlocked at TGE
  cliffMonths: number;
  vestingMonths: number; // total vesting duration including cliff
  monthlyUnlock: number; // tokens unlocked per month during linear phase
  description: string;
}

const VESTING: VestAlloc[] = [
  {
    name: "Ecosystem & Compute Rewards",
    supply: 350_000_000,
    color: "var(--chart-1)",
    tgePct: 0,
    cliffMonths: 0,
    vestingMonths: 36,
    monthlyUnlock: 350_000_000 / 36,
    description: "Emitted continuously as compute supplier rewards",
  },
  {
    name: "Liquidity",
    supply: 200_000_000,
    color: "var(--chart-2)",
    tgePct: 50,
    cliffMonths: 0,
    vestingMonths: 12,
    monthlyUnlock: (200_000_000 * 0.5) / 12,
    description: "50% at TGE, 50% streamed over 12 months (locked via UNCX)",
  },
  {
    name: "Team & Advisors",
    supply: 150_000_000,
    color: "var(--chart-3)",
    tgePct: 0,
    cliffMonths: 6,
    vestingMonths: 24,
    monthlyUnlock: 150_000_000 / 18, // 24 - 6 = 18 months linear
    description: "6-month cliff, then 18-month linear vest",
  },
  {
    name: "Marketing & Partnerships",
    supply: 120_000_000,
    color: "var(--chart-4)",
    tgePct: 10,
    cliffMonths: 0,
    vestingMonths: 18,
    monthlyUnlock: (120_000_000 * 0.9) / 18,
    description: "10% at TGE, remainder released against milestones",
  },
  {
    name: "Treasury / DAO Reserve",
    supply: 100_000_000,
    color: "var(--chart-5)",
    tgePct: 0,
    cliffMonths: 12,
    vestingMonths: 60,
    monthlyUnlock: 100_000_000 / 48, // 60 - 12 = 48
    description: "12-month cliff, multisig-governed, 48-month linear",
  },
  {
    name: "Presale / Early Supporters",
    supply: 80_000_000,
    color: "#94A3B8",
    tgePct: 10,
    cliffMonths: 0,
    vestingMonths: 6,
    monthlyUnlock: (80_000_000 * 0.9) / 6,
    description: "10% at TGE, 90% over 6 months",
  },
];

function vestedAtMonth(a: VestAlloc, m: number): number {
  if (m <= 0) return a.supply * (a.tgePct / 100);
  const tge = a.supply * (a.tgePct / 100);
  const remaining = a.supply - tge;
  if (m < a.cliffMonths) return tge;
  if (m >= a.vestingMonths) return a.supply;
  const linearMonths = a.vestingMonths - a.cliffMonths;
  const elapsedLinear = m - a.cliffMonths;
  return tge + (remaining * elapsedLinear) / linearMonths;
}

interface AllocState extends VestAlloc {
  vestedNow: number;
  remaining: number;
  pctVested: number;
  status: "vesting" | "locked" | "fully-vested";
  nextUnlockDate: Date;
  nextUnlockAmount: number;
  hex: string;
}

function buildStates(): AllocState[] {
  return VESTING.map((a) => {
    const vestedNow = vestedAtMonth(a, NOW_OFFSET_MONTHS);
    const remaining = a.supply - vestedNow;
    const pctVested = (vestedNow / a.supply) * 100;
    let status: AllocState["status"] = "vesting";
    if (pctVested >= 99.5) status = "fully-vested";
    else if (vestedNow <= a.supply * (a.tgePct / 100) + 1) status = "locked";
    // next unlock = 1 month from now (rounded), unless fully vested
    const nextUnlockDate = new Date(REFERENCE_NOW);
    nextUnlockDate.setMonth(nextUnlockDate.getMonth() + 1);
    nextUnlockDate.setDate(1);
    const nextUnlockAmount =
      status === "fully-vested" ? 0 : a.monthlyUnlock;
    return {
      ...a,
      vestedNow,
      remaining,
      pctVested,
      status,
      nextUnlockDate,
      nextUnlockAmount,
      hex: resolveChartColor(a.color),
    };
  });
}

// Total vested to date across all allocations
function totalVested(states: AllocState[]): number {
  return states.reduce((acc, s) => acc + s.vestedNow, 0);
}

// --- KPI tile ----------------------------------------------------------------

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Lock;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="glass glass-hover relative overflow-hidden p-4">
      <div
        className="absolute -right-6 -top-6 size-20 rounded-full blur-3xl"
        style={{ background: `${color}22` }}
      />
      <div className="flex items-center gap-2" style={{ color }}>
        <Icon className="size-4" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

// --- Timeline (Gantt) tab ---------------------------------------------------

const TIMELINE_MONTHS = 60; // 5 years

function GanttTimeline({ states }: { states: AllocState[] }) {
  return (
    <Card className="glass p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">Vesting timeline</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Each bar shows an allocation&apos;s release schedule from TGE (month 0) to fully vested
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-sm bg-pulsar-cyan/70" /> Vested
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-sm bg-white/10" /> Remaining
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-pulsar-cyan" /> Now
          </span>
        </div>
      </div>

      <div className="relative">
        {/* month axis */}
        <div className="mb-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>M{i * 12}</span>
          ))}
        </div>

        {/* bars */}
        <TooltipProvider delayDuration={120}>
          <div className="space-y-3">
            {states.map((s, i) => {
              const leftPct = 0; // all start at TGE
              const widthPct = (s.vestingMonths / TIMELINE_MONTHS) * 100;
              const fillPct = Math.min(100, (NOW_OFFSET_MONTHS / s.vestingMonths) * 100);
              return (
                <div key={s.name} className="group">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: s.hex }}
                      />
                      <span className="font-medium text-foreground">{s.name}</span>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {formatCompact(s.supply)} · {s.pctVested.toFixed(1)}% vested
                    </span>
                  </div>
                  <div className="relative h-7 w-full rounded-md bg-white/[0.03]">
                    {/* cliff marker (shaded area before vesting starts) */}
                    {s.cliffMonths > 0 && (
                      <div
                        className="absolute top-0 bottom-0 rounded-l-md bg-white/[0.04]"
                        style={{
                          left: `${(s.cliffMonths / TIMELINE_MONTHS) * 100}%`,
                          width: 2,
                          background: "rgba(248, 113, 113, 0.4)",
                        }}
                        title={`Cliff ends M${s.cliffMonths}`}
                      />
                    )}
                    <UITip>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute top-0.5 bottom-0.5 overflow-hidden rounded-md border border-white/10"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            background: `linear-gradient(90deg, ${s.hex}33, ${s.hex}11)`,
                          }}
                        >
                          <div
                            className="h-full rounded-l-md transition-all duration-700"
                            style={{
                              width: `${fillPct}%`,
                              background: `linear-gradient(90deg, ${s.hex}cc, ${s.hex}66)`,
                            }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="border-white/10 bg-cosmos/95 text-xs">
                        <div className="space-y-1 font-mono">
                          <div className="font-semibold" style={{ color: s.hex }}>{s.name}</div>
                          <div className="text-muted-foreground">Total: {formatFull(s.supply)}</div>
                          <div className="text-emerald-300">Vested: {formatFull(Math.round(s.vestedNow))}</div>
                          <div className="text-foreground">Remaining: {formatFull(Math.round(s.remaining))}</div>
                          <div className="text-pulsar-cyan">Next: {formatFull(Math.round(s.nextUnlockAmount))} · {s.nextUnlockDate.toLocaleDateString()}</div>
                          <div className="text-muted-foreground">{s.pctVested.toFixed(1)}% complete</div>
                        </div>
                      </TooltipContent>
                    </UITip>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        {/* "Now" vertical line overlay (across all rows) */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10"
          style={{
            left: `calc(${(NOW_OFFSET_MONTHS / TIMELINE_MONTHS) * 100}% - 1px)`,
          }}
        >
          <div className="h-full w-0.5 bg-pulsar-cyan" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-pulsar-cyan px-1.5 py-0.5 font-mono text-[9px] font-bold text-cosmos">
            NOW
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        TGE: {TGE_DATE.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
        · Cliff markers shown as red ticks · Total timeline = {TIMELINE_MONTHS} months
      </p>
    </Card>
  );
}

// --- Schedule table tab -----------------------------------------------------

function statusBadge(status: AllocState["status"]) {
  if (status === "fully-vested")
    return (
      <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
        <CheckCircle2 className="size-3" /> Fully vested
      </Badge>
    );
  if (status === "locked")
    return (
      <Badge className="border-white/20 bg-white/5 text-muted-foreground">
        <Lock className="size-3" /> Locked
      </Badge>
    );
  return (
    <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
      <Unlock className="size-3" /> Vesting
    </Badge>
  );
}

function ScheduleTable({ states }: { states: AllocState[] }) {
  return (
    <Card className="glass p-4 md:p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold">Schedule detail</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete vesting parameters per allocation — fully encoded in the on-chain vesting contract
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Allocation</TableHead>
              <TableHead className="text-right text-muted-foreground">Total</TableHead>
              <TableHead className="text-right text-muted-foreground">TGE %</TableHead>
              <TableHead className="text-right text-muted-foreground">Cliff</TableHead>
              <TableHead className="text-right text-muted-foreground">Vesting</TableHead>
              <TableHead className="text-right text-muted-foreground">Monthly Unlock</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {states.map((s) => (
              <TableRow key={s.name} className="border-white/5">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: s.hex }}
                    />
                    <div>
                      <div className="font-medium text-foreground">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.description}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatCompact(s.supply)}</TableCell>
                <TableCell className="text-right font-mono">{s.tgePct}%</TableCell>
                <TableCell className="text-right font-mono">{s.cliffMonths} mo</TableCell>
                <TableCell className="text-right font-mono">{s.vestingMonths} mo</TableCell>
                <TableCell className="text-right font-mono text-pulsar-cyan">
                  {formatCompact(s.monthlyUnlock)}
                </TableCell>
                <TableCell>{statusBadge(s.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

// --- Circulating supply projection tab --------------------------------------

function buildProjection(states: AllocState[]): {
  month: number;
  label: string;
  circulating: number;
  event?: string;
}[] {
  const burned = TOKENOMICS.burnedSupply;
  const tgeCirculating = states.reduce((acc, s) => acc + vestedAtMonth(s, 0), 0) - burned * 0;
  // major events
  const events: Record<number, string> = {
    6: "Team cliff ends",
    12: "Liquidity fully vested · Treasury cliff ends",
    18: "Marketing fully vested",
    24: "Team fully vested",
    36: "Ecosystem fully vested",
  };

  const out: { month: number; label: string; circulating: number; event?: string }[] = [];
  for (let m = 0; m <= 36; m++) {
    const vested = states.reduce((acc, s) => acc + vestedAtMonth(s, m), 0);
    const circulating = Math.max(0, vested - burned * (m / 36));
    out.push({
      month: m,
      label: m === 0 ? "TGE" : `M${m}`,
      circulating: Math.round(circulating),
      event: events[m],
    });
    void tgeCirculating;
  }
  return out;
}

function ProjectionChart({ states }: { states: AllocState[] }) {
  const data = useMemo(() => buildProjection(states), [states]);

  const eventPoints = data.filter((d) => d.event);

  return (
    <Card className="glass p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">Circulating supply projection</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Projected liquid supply over the next 36 months, accounting for the burn mechanism
          </p>
        </div>
        <Badge className="border-pulsar-cyan/30 bg-pulsar-cyan/10 text-pulsar-cyan">
          <TrendingUp className="size-3" /> 36-month view
        </Badge>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="vestProjGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.55} />
                <stop offset="60%" stopColor="#22D3EE" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8B8FA8", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fill: "#8B8FA8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCompact(v as number)}
              domain={[300_000_000, 1_000_000_000]}
            />
            <Tooltip
              cursor={{ stroke: "rgba(139, 92, 246, 0.3)", strokeWidth: 1 }}
              contentStyle={{
                background: "rgba(11,13,28,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#E6E9F5",
              }}
              formatter={(v: number, _n, p) => {
                const ev = p?.payload?.event;
                return [`${formatFull(v)} PULSAR`, ev ? `Circulating · ${ev}` : "Circulating"];
              }}
            />
            <Area
              type="monotone"
              dataKey="circulating"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fill="url(#vestProjGrad)"
              dot={{ r: 3, fill: "#22D3EE", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#22D3EE", stroke: "#06070F", strokeWidth: 2 }}
            />
            {eventPoints.map((e) => (
              <ReferenceDot
                key={`evt-${e.month}`}
                x={e.label}
                y={e.circulating}
                r={5}
                fill="#FBBF24"
                stroke="#06070F"
                strokeWidth={2}
                isFront
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {eventPoints.map((e) => (
          <span key={e.month} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span className="font-mono">M{e.month}:</span>
            <span>{e.event}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

// --- Claiming simulator -----------------------------------------------------

function ClaimSimulator() {
  const { toast } = useToast();
  const [claimed, setClaimed] = useState(false);
  const total = 100_000;
  const tge = total * 0.1;
  const next = total * 0.15; // 15% per month for 6 months = 90%
  const vestedPct = claimed ? 100 : 25; // demo: 25% vested now (TGE + 1 month)

  return (
    <Card className="glass relative overflow-hidden p-5 md:p-6">
      <div className="absolute -right-8 -top-8 size-32 rounded-full bg-pulsar-cyan/10 blur-3xl" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-pulsar-violet/30 to-pulsar-cyan/20">
            <Gift className="size-5 text-pulsar-cyan" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold">If you were a presale investor…</h3>
            <p className="text-xs text-muted-foreground">Claiming simulator — educational preview</p>
          </div>
        </div>
        <Badge className="border-pulsar-violet/30 bg-pulsar-violet/10 text-pulsar-violet">
          Presale
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Your allocation</div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">
            {formatFull(total)} <span className="text-sm text-muted-foreground">$PULSAR</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Claimable now</div>
          <div className="mt-1 font-display text-2xl font-bold text-pulsar-cyan">
            {formatFull(tge)} <span className="text-sm text-muted-foreground">$PULSAR</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Next unlock (30d)</div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">
            {formatFull(next)} <span className="text-sm text-muted-foreground">$PULSAR</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Fully vested in</div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">6 months</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Vesting progress</span>
          <span className="font-mono text-foreground">{vestedPct}%</span>
        </div>
        <Progress value={vestedPct} className="h-2 bg-white/5" />
      </div>

      <Button
        onClick={() => {
          if (claimed) return;
          setClaimed(true);
          toast({
            title: "Claimed! (simulated)",
            description: `${formatFull(tge)} $PULSAR claimed to your wallet. Real claims happen via the on-chain vesting contract.`,
          });
        }}
        disabled={claimed}
        className="mt-4 w-full bg-gradient-to-r from-pulsar-violet via-pulsar to-pulsar-cyan text-white shadow-lg shadow-pulsar-violet/20 hover:shadow-pulsar-violet/40"
      >
        {claimed ? (
          <>
            <CheckCircle2 className="size-4" /> Claimed
          </>
        ) : (
          <>
            <Unlock className="size-4" /> Claim now ({formatFull(tge)} $PULSAR)
          </>
        )}
      </Button>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" />
        Real claiming happens via the on-chain vesting contract. This is a preview for transparency.
      </p>
    </Card>
  );
}

// --- Main section -----------------------------------------------------------

export function VestingCalendar() {
  const states = useMemo(() => buildStates(), []);
  const total = useMemo(() => totalVested(states), [states]);
  const locked = TOKENOMICS.totalSupply - TOKENOMICS.burnedSupply - total;
  const next24h = states.reduce((acc, s) => acc + s.nextUnlockAmount / 30, 0);

  // fully vested in: longest remaining vesting duration
  const maxEnd = Math.max(...states.map((s) => s.vestingMonths));
  const remainingMonths = Math.max(0, maxEnd - NOW_OFFSET_MONTHS);
  const fullyVestedYears = Math.floor(remainingMonths / 12);
  const fullyVestedRemMonths = Math.round(remainingMonths % 12);

  return (
    <section
      id="vesting"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeading
          eyebrow="Vesting Transparency"
          title="Every locked token, on a public calendar"
          subtitle="Every team, treasury, and presale token is locked in a public, on-chain vesting contract. No silent unlocks, no opaque team allocations. The calendar below shows exactly when every token becomes liquid — now and for the next 3 years."
        />

        {/* KPI tiles */}
        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            icon={Unlock}
            label="Vested to date"
            value={`${formatCompact(total)}`}
            sub={`${((total / TOKENOMICS.totalSupply) * 100).toFixed(1)}% of total supply`}
            color="#34D399"
          />
          <Kpi
            icon={Lock}
            label="Still locked"
            value={`${formatCompact(locked)}`}
            sub={`${((locked / TOKENOMICS.totalSupply) * 100).toFixed(1)}% in vesting contracts`}
            color="#8B5CF6"
          />
          <Kpi
            icon={Clock}
            label="Next unlock (24h)"
            value={`${formatCompact(next24h)}`}
            sub="Streamed across all allocations"
            color="#22D3EE"
          />
          <Kpi
            icon={Calendar}
            label="Fully vested in"
            value={`${fullyVestedYears}y ${fullyVestedRemMonths}m`}
            sub={`All allocations liquid by ${new Date(TGE_DATE.getTime() + maxEnd * MS_PER_MONTH).toLocaleDateString("en-US", { year: "numeric", month: "short" })}`}
            color="#FBBF24"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="mt-8">
          <TabsList className="bg-white/[0.03] p-1">
            <TabsTrigger value="timeline" className="data-[state=active]:bg-pulsar-violet/30 data-[state=active]:text-foreground">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-pulsar-violet/30 data-[state=active]:text-foreground">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="projection" className="data-[state=active]:bg-pulsar-violet/30 data-[state=active]:text-foreground">
              Supply projection
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-6">
            <GanttTimeline states={states} />
          </TabsContent>
          <TabsContent value="schedule" className="mt-6">
            <ScheduleTable states={states} />
          </TabsContent>
          <TabsContent value="projection" className="mt-6">
            <ProjectionChart states={states} />
          </TabsContent>
        </Tabs>

        {/* Claiming simulator */}
        <div className="mt-8">
          <ClaimSimulator />
        </div>
      </motion.div>
    </section>
  );
}
