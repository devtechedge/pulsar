"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Cpu,
  Gauge,
  Zap,
  CircleDot,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Radio,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCompact, formatFull, truncateAddress } from "@/lib/format";
import {
  genAddress,
  mulberry32,
  pick,
  randFloat,
  randInt,
  timeAgo,
  prefersReducedMotion,
} from "@/lib/mock-data";

// --- Constants ---------------------------------------------------------------

const MODELS = [
  "Llama 3.1 70B",
  "Mistral Large 2",
  "Qwen 2.5 72B",
  "DeepSeek V3",
  "GPT-OSS 120B",
  "Phi-4",
  "Gemma 2 27B",
  "Command R+",
] as const;

const SUPPLIERS = [
  { id: "EU-C-1", label: "EU-Central-1", region: "EU-Central" },
  { id: "EU-W-3", label: "EU-West-3", region: "EU-Central" },
  { id: "US-E-1", label: "US-East-1b", region: "US-East" },
  { id: "US-E-2", label: "US-East-2a", region: "US-East" },
  { id: "US-W-1", label: "US-West-2a", region: "US-West" },
  { id: "US-W-2", label: "US-West-1c", region: "US-West" },
  { id: "AP-S-1", label: "AP-South-1", region: "Asia-Pacific" },
  { id: "AP-NE-1", label: "AP-NE-1", region: "Asia-Pacific" },
  { id: "AP-SE-2", label: "AP-SE-2a", region: "Asia-Pacific" },
  { id: "SA-E-1", label: "SA-East-1", region: "LatAm" },
  { id: "ME-C-1", label: "ME-Central-1", region: "LatAm" },
  { id: "AF-S-1", label: "AF-South-1", region: "LatAm" },
] as const;

const GEO_DIST = [
  { region: "US-East", pct: 34, nodes: 2, color: "#8B5CF6" },
  { region: "EU-Central", pct: 28, nodes: 2, color: "#22D3EE" },
  { region: "Asia-Pacific", pct: 22, nodes: 3, color: "#34D399" },
  { region: "US-West", pct: 11, nodes: 2, color: "#FBBF24" },
  { region: "LatAm", pct: 5, nodes: 3, color: "#F472B6" },
];

// SVG geometry
const SVG_W = 800;
const SVG_H = 420;
const CENTER = { x: SVG_W / 2, y: SVG_H / 2 };
const CORE_R = 48;
const SUPPLIER_R = 16;
const SUPPLIER_ORBIT_R = 150;
const CONSUMER_X = 24; // entry point (left)
const SETTLED_X = SVG_W - 24; // exit point (right)

// --- Types ------------------------------------------------------------------

interface Job {
  id: string;
  model: string;
  consumer: `0x${string}`;
  supplierId: string;
  supplierLabel: string;
  cost: number; // $PULSAR
  status: "active" | "settled" | "failed";
  ts: number; // seconds ago
}

interface Pulse {
  id: number;
  job: Job;
  supplierPos: { x: number; y: number };
  startedAt: number;
}

// --- Geometry helpers -------------------------------------------------------

// Pre-compute supplier positions on a circle around the core
const SUPPLIER_POS = SUPPLIERS.map((s, i) => {
  // distribute around full circle
  const angle = (i / SUPPLIERS.length) * Math.PI * 2 - Math.PI / 2;
  return {
    ...s,
    x: CENTER.x + Math.cos(angle) * SUPPLIER_ORBIT_R,
    y: CENTER.y + Math.sin(angle) * SUPPLIER_ORBIT_R,
  };
});

const SUPPLIER_BY_ID = Object.fromEntries(
  SUPPLIER_POS.map((s) => [s.id, s])
) as Record<string, (typeof SUPPLIER_POS)[number]>;

// --- KPI tile ----------------------------------------------------------------

function KpiTile({
  icon: Icon,
  label,
  value,
  unit,
  color,
  trend,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  unit?: string;
  color: string;
  trend?: string;
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
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
          {value}
        </span>
        {unit && <span className="font-mono text-xs text-muted-foreground">{unit}</span>}
      </div>
      {trend && <div className="mt-1 text-[11px] text-emerald-300">{trend}</div>}
    </Card>
  );
}

// --- Pulse visualization ----------------------------------------------------

function PulseDot({ pulse }: { pulse: Pulse }) {
  const sp = pulse.supplierPos;
  // path: consumer(left) -> supplier -> center -> settled(right)
  // use keyframe arrays for cx, cy
  const cx = [CONSUMER_X, sp.x, CENTER.x, SETTLED_X];
  const cy = [CENTER.y, sp.y, CENTER.y, CENTER.y];
  const color =
    pulse.job.status === "failed"
      ? "#F87171"
      : pulse.job.status === "settled"
      ? "#34D399"
      : "#22D3EE";

  return (
    <motion.circle
      r={5}
      fill={color}
      filter="url(#pulseGlow)"
      initial={{ cx: cx[0], cy: cy[0], opacity: 0 }}
      animate={{
        cx,
        cy,
        opacity: [0, 1, 1, 1, 0],
      }}
      transition={{
        duration: 1.6,
        times: [0, 0.08, 0.4, 0.7, 1],
        ease: "easeInOut",
      }}
    />
  );
}

function PulseGraph({ pulses }: { pulses: Pulse[] }) {
  const reduced = typeof window !== "undefined" ? prefersReducedMotion() : false;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Live network visualization: compute pulses traveling between consumer wallets, supplier nodes, and the Pulsar core"
    >
      <defs>
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.4} />
        </radialGradient>
        <radialGradient id="supplierGrad" cx="35%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="100%" stopColor="#0891B2" />
        </radialGradient>
        <filter id="pulseGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="coreGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* background nebula */}
      <radialGradient id="bgNebula2" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="rgba(124, 58, 237, 0.20)" />
        <stop offset="60%" stopColor="rgba(34, 211, 238, 0.07)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
      <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#bgNebula2)" />

      {/* stars */}
      {Array.from({ length: 50 }).map((_, i) => {
        const rng = mulberry32(i + 33);
        const sx = rng() * SVG_W;
        const sy = rng() * SVG_H;
        const sr = rng() * 1.1 + 0.3;
        return (
          <circle
            key={`np-star-${i}`}
            cx={sx}
            cy={sy}
            r={sr}
            fill="white"
            opacity={0.12 + rng() * 0.4}
          />
        );
      })}

      {/* orbit ring */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={SUPPLIER_ORBIT_R}
        fill="none"
        stroke="rgba(139, 92, 246, 0.18)"
        strokeWidth={1}
        strokeDasharray="2 6"
      />
      {/* second orbit */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={SUPPLIER_ORBIT_R + 30}
        fill="none"
        stroke="rgba(34, 211, 238, 0.08)"
        strokeWidth={1}
        strokeDasharray="1 8"
      />

      {/* connection lines from each supplier to core (faint) */}
      {SUPPLIER_POS.map((s) => (
        <line
          key={`l-${s.id}`}
          x1={s.x}
          y1={s.y}
          x2={CENTER.x}
          y2={CENTER.y}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={1}
        />
      ))}

      {/* consumer entry / settled exit lanes */}
      <line
        x1={0}
        y1={CENTER.y}
        x2={CENTER.x - SUPPLIER_ORBIT_R - 20}
        y2={CENTER.y}
        stroke="rgba(34, 211, 238, 0.25)"
        strokeWidth={1.5}
        strokeDasharray="4 6"
      />
      <line
        x1={CENTER.x + SUPPLIER_ORBIT_R + 20}
        y1={CENTER.y}
        x2={SVG_W}
        y2={CENTER.y}
        stroke="rgba(52, 211, 153, 0.25)"
        strokeWidth={1.5}
        strokeDasharray="4 6"
      />

      {/* entry/exit labels */}
      <text x={6} y={CENTER.y - 14} fill="#22D3EE" fontSize={10} fontFamily="var(--font-mono)" opacity={0.7}>
        ◄ consumer
      </text>
      <text x={SVG_W - 86} y={CENTER.y - 14} fill="#34D399" fontSize={10} fontFamily="var(--font-mono)" opacity={0.7}>
        settled ►
      </text>

      {/* active pulses */}
      <AnimatePresence>
        {pulses.map((p) => (
          <PulseDot key={p.id} pulse={p} />
        ))}
      </AnimatePresence>

      {/* core (Pulsar core) */}
      <g filter="url(#coreGlow)">
        <motion.circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={CORE_R}
          fill="url(#coreGrad)"
          initial={false}
          animate={reduced ? false : { scale: [1, 1.05, 1], rotate: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
        />
        {/* rotating ring */}
        <motion.circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={CORE_R + 10}
          fill="none"
          stroke="rgba(196, 181, 253, 0.55)"
          strokeWidth={1.2}
          strokeDasharray="6 10"
          initial={false}
          animate={reduced ? false : { rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
        />
        <text
          x={CENTER.x}
          y={CENTER.y + 5}
          textAnchor="middle"
          fontSize={13}
          fontWeight={800}
          fill="#fff"
          fontFamily="var(--font-display)"
          letterSpacing="0.05em"
        >
          PULSAR
        </text>
      </g>

      {/* suppliers */}
      <TooltipProvider delayDuration={120}>
        {SUPPLIER_POS.map((s) => (
          <Tooltip key={s.id}>
            <TooltipTrigger asChild>
              <g className="cursor-pointer">
                <motion.circle
                  cx={s.x}
                  cy={s.y}
                  r={SUPPLIER_R}
                  fill="url(#supplierGrad)"
                  stroke="rgba(103, 232, 249, 0.6)"
                  strokeWidth={1.2}
                  initial={false}
                  animate={reduced ? false : { scale: [1, 1.12, 1] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (s.x + s.y) * 0.002,
                  }}
                  style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                />
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={SUPPLIER_R + 4}
                  fill="none"
                  stroke="rgba(103, 232, 249, 0.2)"
                  strokeWidth={1}
                />
                <text
                  x={s.x}
                  y={s.y + SUPPLIER_R + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#8B8FA8"
                  fontFamily="var(--font-mono)"
                >
                  {s.label}
                </text>
              </g>
            </TooltipTrigger>
            <TooltipContent side="top" className="border-white/10 bg-cosmos/95 text-xs">
              <div className="space-y-0.5 font-mono">
                <div className="font-semibold text-pulsar-cyan">{s.label}</div>
                <div className="text-muted-foreground">Region: {s.region}</div>
                <div className="text-muted-foreground">GPU: 8× H100</div>
                <div className="text-emerald-300">Status: online</div>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </svg>
  );
}

// --- Live job feed ----------------------------------------------------------

function JobFeed({ jobs }: { jobs: Job[] }) {
  return (
    <Card className="glass p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">Live job feed</h3>
          <p className="mt-1 text-sm text-muted-foreground">Last 8 inference jobs settled on Pulsar</p>
        </div>
        <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
          Streaming
        </Badge>
      </div>
      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-pulsar-violet/20 to-pulsar-cyan/20">
                {job.status === "active" ? (
                  <Radio className="size-4 animate-pulse text-pulsar-cyan" />
                ) : job.status === "settled" ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <XCircle className="size-4 text-red-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="truncate font-medium text-foreground">{job.model}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="font-mono">{truncateAddress(job.consumer)}</span>
                  <span>→</span>
                  <span className="font-mono">{job.supplierLabel}</span>
                  <span>·</span>
                  <span>{timeAgo(job.ts)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-semibold text-pulsar-cyan">
                  {formatFull(Math.round(job.cost))}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">PULSAR</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {jobs.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
            Waiting for incoming jobs…
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Geographic distribution -----------------------------------------------

function GeoDistribution() {
  return (
    <Card className="glass p-5 md:p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold">Geographic distribution</h3>
        <p className="mt-1 text-sm text-muted-foreground">Active supplier nodes &amp; job share by region</p>
      </div>
      <div className="space-y-3">
        {GEO_DIST.map((g) => (
          <div key={g.region}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: g.color }} />
                <span className="font-medium text-foreground">{g.region}</span>
                <span className="font-mono text-xs text-muted-foreground">{g.nodes} nodes</span>
              </span>
              <span className="font-mono text-sm font-semibold" style={{ color: g.color }}>
                {g.pct}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: g.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${g.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
        <CircleDot className="size-3.5 text-pulsar-cyan" />
        <span className="text-muted-foreground">
          12 active suppliers · 6 regions · 99.94% uptime last 30d
        </span>
      </div>
    </Card>
  );
}

// --- Main section -----------------------------------------------------------

export function NetworkPulse() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [kpis, setKpis] = useState({
    jobsPerSec: 12.4,
    suppliers: 1247,
    settled24h: 89420,
    latency: 1.2,
  });
  const pulseIdRef = useRef(0);
  const jobIdRef = useRef(0);

  // initial seed of jobs (so the feed isn't empty on first paint)
  const seededJobs = useMemo<Job[]>(() => {
    const rng = mulberry32(20240910);
    return Array.from({ length: 6 }, (_, i) => {
      const sup = pick(rng, SUPPLIER_POS);
      return {
        id: `seed-${i}`,
        model: pick(rng, MODELS),
        consumer: genAddress(rng),
        supplierId: sup.id,
        supplierLabel: sup.label,
        cost: randFloat(rng, 0.4, 28),
        status: pick(rng, ["settled", "settled", "settled", "active"] as const),
        ts: (i + 1) * 1.4 + randFloat(rng, 0, 1.2),
      };
    });
  }, []);

  // init jobs
  useEffect(() => {
    setJobs(seededJobs);
  }, [seededJobs]);

  // pulse generator: every 800ms add a new pulse + job
  useEffect(() => {
    const id = setInterval(() => {
      pulseIdRef.current += 1;
      jobIdRef.current += 1;
      const rng = mulberry32(Date.now() ^ (pulseIdRef.current * 2654435761));
      const sup = pick(rng, SUPPLIER_POS);
      const status = pick(rng, ["settled", "settled", "settled", "settled", "active", "failed"] as const);
      const cost = randFloat(rng, 0.4, 28);
      const job: Job = {
        id: `job-${jobIdRef.current}`,
        model: pick(rng, MODELS),
        consumer: genAddress(rng),
        supplierId: sup.id,
        supplierLabel: sup.label,
        cost,
        status,
        ts: 0,
      };
      const pulse: Pulse = {
        id: pulseIdRef.current,
        job,
        supplierPos: { x: sup.x, y: sup.y },
        startedAt: Date.now(),
      };
      setPulses((prev) => [...prev.slice(-4), pulse]);
      setJobs((prev) => [job, ...prev].slice(0, 8));

      // after pulse animation, mark job as settled
      setTimeout(() => {
        setPulses((prev) => prev.filter((p) => p.id !== pulse.id));
      }, 1700);
    }, 800);
    return () => clearInterval(id);
  }, []);

  // KPI ticker — gently fluctuate values every 1.5s
  useEffect(() => {
    const id = setInterval(() => {
      const rng = mulberry32(Date.now() & 0xffff);
      setKpis((k) => ({
        jobsPerSec: Math.max(8, k.jobsPerSec + (rng() - 0.5) * 0.8),
        suppliers: k.suppliers + (rng() < 0.5 ? 0 : rng() < 0.7 ? 1 : -1),
        settled24h: k.settled24h + randInt(rng, 6, 24),
        latency: Math.max(0.6, k.latency + (rng() - 0.5) * 0.1),
      }));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // age jobs every second
  useEffect(() => {
    const id = setInterval(() => {
      setJobs((prev) => prev.map((j) => ({ ...j, ts: j.ts + 1 })));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="pulse"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <SectionHeading
          eyebrow="Live Network"
          title="Every compute job is a pulse"
          subtitle="Every compute job on Pulsar is a pulse of intelligence traveling from consumer to supplier and back. The visualization below shows the live network in action — each pulse is a real inference job settled in $PULSAR. Watch the network breathe."
        />

        {/* KPI strip */}
        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile
            icon={Zap}
            label="Jobs / sec"
            value={kpis.jobsPerSec.toFixed(1)}
            color="#22D3EE"
            trend="▲ 8.4% vs 1h ago"
          />
          <KpiTile
            icon={Cpu}
            label="Active suppliers"
            value={formatFull(kpis.suppliers)}
            color="#8B5CF6"
            trend="▲ 12 new in 24h"
          />
          <KpiTile
            icon={Activity}
            label="$PULSAR settled (24h)"
            value={formatFull(kpis.settled24h)}
            color="#34D399"
            trend="▲ streaming live"
          />
          <KpiTile
            icon={Gauge}
            label="Avg latency"
            value={kpis.latency.toFixed(2)}
            unit="s"
            color="#FBBF24"
            trend="▼ 12ms vs 1h ago"
          />
        </div>

        {/* Main grid: graph + sidebar */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="glass relative overflow-hidden p-3 md:p-4 lg:col-span-2">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <Badge className="border-pulsar-violet/30 bg-pulsar-violet/10 text-pulsar-violet">
                <Radio className="size-3 animate-pulse" /> Live
              </Badge>
            </div>
            <PulseGraph pulses={pulses} />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-pulsar-cyan" /> Active request
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" /> Settled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-400" /> Failed
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="size-3" /> Hover suppliers for details
              </span>
            </div>
          </Card>

          <div className="space-y-6">
            <JobFeed jobs={jobs} />
            <GeoDistribution />
          </div>
        </div>

        {/* footer note */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 flex items-start gap-3 rounded-2xl border border-pulsar-cyan/20 bg-gradient-to-br from-pulsar-cyan/[0.06] via-transparent to-pulsar-violet/[0.06] p-5 md:p-6"
        >
          <Radio className="mt-0.5 size-5 shrink-0 text-pulsar-cyan" />
          <div className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">This is a simulated live preview.</span>{" "}
            At mainnet launch, every pulse you see will correspond to a real inference job settled
            on-chain in $PULSAR — verifiable via the Pulsar Explorer. The data shown here mirrors
            the real network&apos;s structure (consumer → supplier → core → settled) but uses
            deterministic mock traffic.
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
