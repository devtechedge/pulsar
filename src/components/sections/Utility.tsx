"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  Cpu,
  Flame,
  Coins,
  ArrowLeftRight,
  Boxes,
  Bot,
  Database,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";

interface UtilityCard {
  icon: LucideIcon;
  title: string;
  body: string;
  status: "LIVE" | "ROADMAP";
  tint: "violet" | "cyan";
}

const CARDS: UtilityCard[] = [
  {
    icon: BrainCircuit,
    title: "Pay for AI inference",
    body: "Every model call — LLM, image, voice, vision — is priced and settled in $PULSAR. No subscriptions, no credits, no platform lock-in.",
    status: "LIVE",
    tint: "violet",
  },
  {
    icon: Cpu,
    title: "Earn by supplying GPU",
    body: "Register your hardware as a supplier node and earn $PULSAR for every verified proof-of-compute you return to the network.",
    status: "LIVE",
    tint: "cyan",
  },
  {
    icon: Flame,
    title: "Protocol-fee buyback-and-burn",
    body: "A share of every protocol fee funds a quarterly buyback-and-burn of $PULSAR, shrinking circulating supply as usage grows.",
    status: "LIVE",
    tint: "violet",
  },
  {
    icon: Coins,
    title: "Stake for APY",
    body: "Lock $PULSAR in the staking contract to earn a share of protocol rewards. APY is set by the multisig and visible on-chain.",
    status: "LIVE",
    tint: "cyan",
  },
  {
    icon: ArrowLeftRight,
    title: "Transfer of value on Base",
    body: "Fast, cheap, peer-to-peer value transfer on Base. Use $PULSAR to tip creators, pay for agents, or settle between services.",
    status: "LIVE",
    tint: "violet",
  },
  {
    icon: Boxes,
    title: "Model marketplace",
    body: "A curated directory of open and proprietary models, each with transparent pricing and on-chain reputation for suppliers.",
    status: "ROADMAP",
    tint: "cyan",
  },
  {
    icon: Bot,
    title: "Agent-to-agent payments",
    body: "Autonomous agents settle micro-transactions in $PULSAR — paying each other for data, inference, and orchestration without humans in the loop.",
    status: "ROADMAP",
    tint: "violet",
  },
  {
    icon: Database,
    title: "Data rewards",
    body: "Contributors who supply training data or fine-tunes earn $PULSAR automatically when their contribution is used in a paid job.",
    status: "ROADMAP",
    tint: "cyan",
  },
  {
    icon: Vote,
    title: "DAO governance over compute pricing",
    body: "Stakers propose and vote on protocol parameters — fee shares, supplier tiers, supported models — turning $PULSAR into a governance instrument.",
    status: "ROADMAP",
    tint: "violet",
  },
];

export function Utility() {
  return (
    <section id="utility" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="Utility"
        title="What $PULSAR does today — and tomorrow"
        subtitle="Real utility from day one. A broader compute economy over time."
      />

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c, i) => (
          <motion.article
            key={c.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.06 }}
            viewport={{ once: true, margin: "-80px" }}
            className="glass glass-hover relative flex flex-col rounded-2xl p-6"
          >
            <div className="mb-5 flex items-start justify-between">
              <div
                className={
                  "inline-flex size-12 items-center justify-center rounded-xl ring-1 " +
                  (c.tint === "violet"
                    ? "bg-pulsar-violet/15 text-pulsar-violet ring-pulsar-violet/30"
                    : "bg-pulsar-cyan/15 text-pulsar-cyan ring-pulsar-cyan/30")
                }
              >
                <c.icon className="size-6" />
              </div>
              <Badge
                className={
                  c.status === "LIVE"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-muted-foreground"
                }
              >
                {c.status === "LIVE" ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-400" /> LIVE
                  </>
                ) : (
                  "ROADMAP"
                )}
              </Badge>
            </div>
            <h3 className="font-display text-lg font-bold">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
