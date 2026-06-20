"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel,
  Vote,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  UserCircle,
  CheckCircle2,
  XCircle,
  History,
  Trophy,
  Link2,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { genAddress, mulberry32 } from "@/lib/mock-data";
import { formatCompact, truncateAddress } from "@/lib/format";

type IconType = React.ComponentType<{ className?: string }>;

// ---------------------------------------------------------------------------
// Proposal data (deterministic)
// ---------------------------------------------------------------------------

interface Proposal {
  id: string;
  title: string;
  proposer: `0x${string}`;
  submittedAt: number;
  endsAt: number;
  description: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  status: "active" | "passed" | "failed";
}

const DAY = 24 * 60 * 60 * 1000;
// Fixed reference timestamp — using Date.now() at module load causes SSR/CSR
// hydration mismatch. Pin to a stable value at "today" (2026-06-20) so the
// active proposals' endsAt stays in the future relative to the real clock.
// Countdowns read Date.now() inside useEffect (client-only) so they tick live.
const NOW = 1781913600000; // 2026-06-20T00:00:00Z — stable anchor near today

const ACTIVE_PROPOSALS: Proposal[] = [
  {
    id: "PIP-001",
    title: "Lower buy tax from 2% to 1%",
    proposer: genAddress(mulberry32(1001)),
    submittedAt: NOW - 2 * DAY,
    endsAt: NOW + 1.4 * DAY,
    description:
      "Proposal to halve the buy-side transfer tax from 200 bps to 100 bps, narrowing the buy/sell asymmetry. The treasury will absorb the revenue loss via the existing reserves. Modeled impact: ~$1.8M annual reduction in tax inflows, offset by ~12% projected volume lift from lower friction.",
    forVotes: 4_120_000,
    againstVotes: 1_340_000,
    abstainVotes: 220_000,
    status: "active",
  },
  {
    id: "PIP-002",
    title: "Allocate 5M $PULSAR to GPU supplier bounty program",
    proposer: genAddress(mulberry32(1002)),
    submittedAt: NOW - 1 * DAY,
    endsAt: NOW + 3 * DAY,
    description:
      "Earmark 5M $PULSAR from the ecosystem allocation to a 90-day bounty program that pays top-50 node operators a multiplier on verified compute. Goal: lift total network TFLOPS by 25% and onboard 200 new suppliers before the next epoch. Funds vest linearly against on-chain contribution proofs.",
    forVotes: 6_810_000,
    againstVotes: 740_000,
    abstainVotes: 410_000,
    status: "active",
  },
  {
    id: "PIP-003",
    title: "Add Llama 4 to whitelisted models",
    proposer: genAddress(mulberry32(1003)),
    submittedAt: NOW - 0.5 * DAY,
    endsAt: NOW + 4.5 * DAY,
    description:
      "Authorize the addition of Meta's Llama 4 family (Scout and Maverick) to the on-chain model whitelist, enabling supplier nodes to opt-in to hosting these models. Pricing oracle will be updated with a new tier. No token emission changes. Whitelist governs which models the protocol fees apply to.",
    forVotes: 2_980_000,
    againstVotes: 2_410_000,
    abstainVotes: 380_000,
    status: "active",
  },
];

const HISTORY_PROPOSALS: Proposal[] = [
  {
    id: "PIP-000",
    title: "Initialize staking rewards at 12% APY",
    proposer: genAddress(mulberry32(1000)),
    submittedAt: NOW - 30 * DAY,
    endsAt: NOW - 27 * DAY,
    description: "Set initial staking APY to 12% for the first epoch.",
    forVotes: 9_120_000,
    againstVotes: 640_000,
    abstainVotes: 180_000,
    status: "passed",
  },
  {
    id: "PIP-998",
    title: "Migrate LP from V2 to V3 concentrated liquidity",
    proposer: genAddress(mulberry32(998)),
    submittedAt: NOW - 22 * DAY,
    endsAt: NOW - 19 * DAY,
    description: "Move protocol-owned LP from Uniswap V2 to a V3 concentrated position.",
    forVotes: 5_240_000,
    againstVotes: 4_880_000,
    abstainVotes: 920_000,
    status: "failed",
  },
  {
    id: "PIP-997",
    title: "Set protocol fee to 1%",
    proposer: genAddress(mulberry32(997)),
    submittedAt: NOW - 45 * DAY,
    endsAt: NOW - 42 * DAY,
    description: "Establish a 1% protocol fee on all compute settlements, routed 50/50 to treasury and burn.",
    forVotes: 7_810_000,
    againstVotes: 1_240_000,
    abstainVotes: 510_000,
    status: "passed",
  },
  {
    id: "PIP-996",
    title: "Open supplier registration to all regions",
    proposer: genAddress(mulberry32(996)),
    submittedAt: NOW - 60 * DAY,
    endsAt: NOW - 57 * DAY,
    description: "Remove region whitelist; any address can register a node in any region.",
    forVotes: 6_410_000,
    againstVotes: 980_000,
    abstainVotes: 230_000,
    status: "passed",
  },
  {
    id: "PIP-995",
    title: "Add 2% sell tax to fund initial liquidity",
    proposer: genAddress(mulberry32(995)),
    submittedAt: NOW - 75 * DAY,
    endsAt: NOW - 72 * DAY,
    description: "Temporary 2% sell tax for 90 days post-launch to bootstrap deep LP.",
    forVotes: 3_120_000,
    againstVotes: 5_240_000,
    abstainVotes: 410_000,
    status: "failed",
  },
];

// ---------------------------------------------------------------------------
// Top voters (delegates) leaderboard
// ---------------------------------------------------------------------------

const TOP_VOTERS = (() => {
  const rng = mulberry32(5500);
  return Array.from({ length: 5 }).map((_, i) => ({
    rank: i + 1,
    address: genAddress(mulberry32(5500 + i)),
    votingPower: Math.round((5_000_000 - i * 800_000) * (0.6 + rng() * 0.8)),
    proposalsVoted: 18 - i * 2 + Math.floor(rng() * 4),
  }));
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCountdown(ms: number): string {
  if (ms <= 0) return "ended";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function totalVotes(p: Proposal): number {
  return p.forVotes + p.againstVotes + p.abstainVotes;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VoteBar({ proposal }: { proposal: Proposal }) {
  const total = totalVotes(proposal);
  const forPct = (proposal.forVotes / total) * 100;
  const againstPct = (proposal.againstVotes / total) * 100;
  const abstainPct = (proposal.abstainVotes / total) * 100;
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full bg-emerald-400"
          initial={{ width: 0 }}
          whileInView={{ width: `${forPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="h-full bg-rose-400"
          initial={{ width: 0 }}
          whileInView={{ width: `${againstPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
        <motion.div
          className="h-full bg-slate-400/60"
          initial={{ width: 0 }}
          whileInView={{ width: `${abstainPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1.5 text-emerald-300">
          <ThumbsUp className="size-3" />
          For · {formatCompact(proposal.forVotes)} · {forPct.toFixed(1)}%
        </span>
        <span className="flex items-center gap-1.5 text-rose-300">
          <ThumbsDown className="size-3" />
          Against · {formatCompact(proposal.againstVotes)} · {againstPct.toFixed(1)}%
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Minus className="size-3" />
          Abstain · {formatCompact(proposal.abstainVotes)} · {abstainPct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  onVote,
  voted,
}: {
  proposal: Proposal;
  onVote: (id: string, choice: "for" | "against" | "abstain") => void;
  voted: "for" | "against" | "abstain" | null;
}) {
  const remaining = proposal.endsAt - Date.now();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-hover rounded-2xl p-5"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-md bg-pulsar-violet/15 px-2 py-0.5 font-mono text-[10px] font-bold text-pulsar-violet">
            {proposal.id}
          </span>
          <h3 className="font-display text-base font-bold leading-snug md:text-lg">
            {proposal.title}
          </h3>
        </div>
        {proposal.status === "active" && (
          <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <span className="size-1 rounded-full bg-emerald-300" /> active
          </Badge>
        )}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {proposal.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <UserCircle className="size-3" /> by{" "}
          <span className="font-mono text-foreground">{truncateAddress(proposal.proposer)}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" /> ends in{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatCountdown(remaining)}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <Vote className="size-3" /> {formatCompact(totalVotes(proposal))} votes
        </span>
      </div>

      <div className="mt-4">
        <VoteBar proposal={proposal} />
      </div>

      {proposal.status === "active" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onVote(proposal.id, "for")}
            disabled={!!voted}
            className={`h-8 border text-xs ${
              voted === "for"
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                : "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300 hover:bg-emerald-400/15"
            }`}
          >
            <ThumbsUp className="size-3.5" /> {voted === "for" ? "Voted For" : "Vote For"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onVote(proposal.id, "against")}
            disabled={!!voted}
            className={`h-8 border text-xs ${
              voted === "against"
                ? "border-rose-400/40 bg-rose-400/15 text-rose-300"
                : "border-rose-400/30 bg-rose-400/[0.06] text-rose-300 hover:bg-rose-400/15"
            }`}
          >
            <ThumbsDown className="size-3.5" /> {voted === "against" ? "Voted Against" : "Vote Against"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onVote(proposal.id, "abstain")}
            disabled={!!voted}
            className={`h-8 border text-xs ${
              voted === "abstain"
                ? "border-white/30 bg-white/10 text-foreground"
                : "border-white/15 bg-white/[0.03] text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Minus className="size-3.5" /> {voted === "abstain" ? "Abstained" : "Abstain"}
          </Button>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-pulsar-cyan hover:underline"
          >
            <Link2 className="size-3" /> View full proposal
          </button>
        </div>
      )}

      {voted && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300">
          <CheckCircle2 className="size-3" />
          Vote cast! (simulated)
        </div>
      )}
    </motion.div>
  );
}

function HistoryRow({ proposal }: { proposal: Proposal }) {
  const total = totalVotes(proposal);
  const forPct = (proposal.forVotes / total) * 100;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg">
        {proposal.status === "passed" ? (
          <CheckCircle2 className="size-5 text-emerald-300" />
        ) : (
          <XCircle className="size-5 text-rose-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-pulsar-violet">{proposal.id}</span>
          <span className="truncate text-sm font-semibold text-foreground">{proposal.title}</span>
        </div>
        <div className="mt-1.5">
          <Progress
            value={forPct}
            className="h-1.5 bg-rose-400/20 [&_[data-slot=progress-indicator]]:bg-emerald-400"
          />
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[11px] font-semibold text-foreground">
          {forPct.toFixed(1)}% for
        </div>
        <Badge
          className={
            proposal.status === "passed"
              ? "border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0 text-[9px] text-emerald-300"
              : "border-rose-400/30 bg-rose-400/10 px-1.5 py-0 text-[9px] text-rose-300"
          }
        >
          {proposal.status}
        </Badge>
      </div>
    </motion.div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: IconType;
  label: string;
  value: string;
  accent: "violet" | "cyan" | "amber";
}) {
  const palette: Record<typeof accent, string> = {
    violet: "bg-pulsar-violet/15 text-pulsar-violet ring-pulsar-violet/30",
    cyan: "bg-pulsar-cyan/15 text-pulsar-cyan ring-pulsar-cyan/30",
    amber: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  };
  return (
    <div className="glass glass-hover rounded-xl p-4">
      <div className={`mb-2 inline-flex size-9 items-center justify-center rounded-lg ring-1 ${palette[accent]}`}>
        <Icon className="size-4.5" />
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GovernanceExplorer() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const [active, setActive] = useState<Proposal[]>(ACTIVE_PROPOSALS);
  const [voted, setVoted] = useState<Record<string, "for" | "against" | "abstain" | null>>({});

  // Live vote ticking — small random walk every 4s on active proposals
  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) =>
        prev.map((p) => {
          const choice = Math.random();
          const bump = Math.floor(Math.random() * 8000) + 500;
          if (choice < 0.6) return { ...p, forVotes: p.forVotes + bump };
          if (choice < 0.85) return { ...p, againstVotes: p.againstVotes + bump };
          return { ...p, abstainVotes: p.abstainVotes + Math.floor(bump / 4) };
        })
      );
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // KPIs
  const passedCount = HISTORY_PROPOSALS.filter((p) => p.status === "passed").length;
  const totalVotesThisCycle = active.reduce((acc, p) => acc + totalVotes(p), 0);

  // Mock voting power — only if connected
  const mockPulBalance = useMemo(() => {
    if (!address) return 0;
    // deterministic per-address
    const rng = mulberry32(address.length * 7 + address.charCodeAt(2));
    return Math.round(1000 + rng() * 48000);
  }, [address]);
  const mockStaked = useMemo(() => {
    if (!address) return 0;
    const rng = mulberry32(address.length * 13 + address.charCodeAt(5));
    return Math.round(500 + rng() * 22000);
  }, [address]);
  const votingPower = mockPulBalance + mockStaked * 2;

  // Delegation
  const [delegateInput, setDelegateInput] = useState<string>("");
  const [delegate, setDelegate] = useState<`0x${string}` | null>(null);

  function handleVote(id: string, choice: "for" | "against" | "abstain") {
    if (voted[id]) return;
    setActive((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const bump = votingPower || 1;
        if (choice === "for") return { ...p, forVotes: p.forVotes + bump };
        if (choice === "against") return { ...p, againstVotes: p.againstVotes + bump };
        return { ...p, abstainVotes: p.abstainVotes + bump };
      })
    );
    setVoted((v) => ({ ...v, [id]: choice }));
    toast({
      title: "Vote cast! (simulated)",
      description: `${id}: voted ${choice.toUpperCase()} with ${formatCompact(votingPower)} voting power.`,
    });
  }

  function handleDelegate() {
    if (!delegateInput.startsWith("0x") || delegateInput.length < 6) {
      toast({
        title: "Invalid address",
        description: "Enter a valid 0x-prefixed address.",
        variant: "destructive",
      });
      return;
    }
    setDelegate(delegateInput as `0x${string}`);
    toast({
      title: "Delegated! (simulated)",
      description: `Your voting power is now delegated to ${truncateAddress(delegateInput as `0x${string}`)}.`,
    });
    setDelegateInput("");
  }

  function handleRevoke() {
    setDelegate(null);
    toast({ title: "Delegation revoked", description: "You are now voting directly again." });
  }

  return (
    <section
      id="governance"
      className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8"
    >
      <SectionHeading
        eyebrow="Governance"
        title="DAO over compute pricing &amp; protocol"
        subtitle="$PULSAR stakers govern the network — on-chain, transparent, binding."
      />

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base"
      >
        Pulsar is governed by $PULSAR stakers. Proposals cover compute pricing,
        treasury allocations, model whitelisting, and protocol parameters. Every
        vote is on-chain, transparent, and binding — no off-chain side deals.
      </motion.p>

      {/* ---------------- KPI TILES + VOTING POWER ---------------- */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={CheckCircle2}
          label="Proposals passed"
          value={String(passedCount)}
          accent="amber"
        />
        <KpiTile
          icon={Vote}
          label="Active proposals"
          value={String(active.length)}
          accent="cyan"
        />
        <KpiTile
          icon={TrendingUp}
          label="Votes cast (this cycle)"
          value={formatCompact(totalVotesThisCycle)}
          accent="violet"
        />
        {/* Voting power card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="glass glass-hover rounded-xl p-4"
        >
          <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-pulsar-violet/15 text-pulsar-violet ring-1 ring-pulsar-violet/30">
            <Gavel className="size-4.5" />
          </div>
          {isConnected ? (
            <>
              <div className="text-[11px] text-muted-foreground">Your voting power</div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums text-gradient">
                {formatCompact(votingPower)}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {formatCompact(mockPulBalance)} $PULSAR + {formatCompact(mockStaked)} staked ×2
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] text-muted-foreground">Your voting power</div>
              <div className="mt-1 text-xs text-muted-foreground">Connect wallet to see your voting power</div>
              <div className="mt-2">
                <ConnectButton />
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ---------------- MAIN: PROPOSALS + SIDEBAR ---------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-white/[0.03]">
            <TabsTrigger value="active" className="gap-1.5">
              <Vote className="size-3.5" /> Active ({active.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="size-3.5" /> History ({HISTORY_PROPOSALS.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4 focus-visible:outline-none">
            <AnimatePresence mode="popLayout">
              {active.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onVote={handleVote}
                  voted={voted[p.id] ?? null}
                />
              ))}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2 focus-visible:outline-none">
            {HISTORY_PROPOSALS.map((p) => (
              <HistoryRow key={p.id} proposal={p} />
            ))}
          </TabsContent>
        </Tabs>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* Delegation card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
            className="glass glass-hover rounded-2xl p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <Users className="size-4.5 text-pulsar-violet" />
              <h3 className="font-display text-base font-bold">Delegation</h3>
            </div>

            {!delegate ? (
              <>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Delegate your voting power to another address. They will vote
                  on your behalf — you keep full $PULSAR custody.
                </p>
                <Input
                  type="text"
                  placeholder="0x… address to delegate"
                  value={delegateInput}
                  onChange={(e) => setDelegateInput(e.target.value)}
                  className="mt-3 h-10 bg-white/5 font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={handleDelegate}
                  className="mt-3 h-10 w-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient text-sm font-semibold text-white"
                >
                  <Users className="size-4" /> Delegate voting power
                </Button>
              </>
            ) : (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 className="mr-1 inline size-3" />
                    Delegating to
                  </span>
                  <Badge className="border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0 text-[9px] text-emerald-300">
                    active
                  </Badge>
                </div>
                <div className="mt-1.5 font-mono text-xs font-semibold text-foreground">
                  {truncateAddress(delegate)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRevoke}
                  className="mt-3 h-8 w-full border border-rose-400/30 bg-rose-400/10 text-xs font-semibold text-rose-300 hover:bg-rose-400/15"
                >
                  Revoke delegation
                </Button>
              </div>
            )}
          </motion.div>

          {/* Top voters leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="glass glass-hover rounded-2xl p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="size-4.5 text-amber-300" />
              <h3 className="font-display text-base font-bold">Top voters</h3>
            </div>
            <div className="space-y-2">
              {TOP_VOTERS.map((v) => (
                <div
                  key={v.address}
                  className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] p-2.5"
                >
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-md font-display text-xs font-bold ${
                      v.rank === 1
                        ? "bg-amber-400/20 text-amber-300"
                        : v.rank === 2
                          ? "bg-slate-300/15 text-slate-200"
                          : v.rank === 3
                            ? "bg-orange-400/15 text-orange-300"
                            : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {v.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-semibold text-foreground">
                      {truncateAddress(v.address)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {v.proposalsVoted} proposals voted
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-pulsar-cyan">
                      {formatCompact(v.votingPower)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">VP</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"
      >
        <Loader2 className="size-3 animate-spin text-pulsar-cyan/60" />
        Quorum: 10M voting power · 3-day voting window · 1 $PULSAR = 1 vote (staked = 2)
      </motion.div>
    </section>
  );
}
