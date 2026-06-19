"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  Boxes,
  Coins,
  Sparkles,
  Server,
  Cpu,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const CONSUMER_STEPS = [
  { icon: Wallet, title: "Connect wallet on Base", body: "Connect any EVM wallet to the Base network. No KYC, no signup, no platform account." },
  { icon: Boxes, title: "Browse models", body: "Pick from LLM, image, voice, and vision models published by suppliers on the network." },
  { icon: Coins, title: "Pay $PULSAR per inference", body: "Each job is priced in $PULSAR. Approve the spend and the request is routed to a supplier." },
  { icon: Sparkles, title: "Receive output on-chain", body: "The supplier returns the result and a proof-of-compute. Settlement is atomic and auditable." },
];

const SUPPLIER_STEPS = [
  { icon: Server, title: "Register your GPU node", body: "Run the Pulsar supplier client. Announce your hardware, model support, and price." },
  { icon: Cpu, title: "Receive inference jobs", body: "The network routes matching jobs to your node based on price, latency, and reputation." },
  { icon: Coins, title: "Earn $PULSAR per proof", body: "For every verified proof-of-compute you submit, payment settles to your wallet in $PULSAR." },
  { icon: TrendingUp, title: "Stake rewards for higher APY", body: "Lock earned $PULSAR in the staking contract to compound yield from protocol fees." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="How it works"
        title="Two flows, one token"
        subtitle="Consumers pay to run models. Suppliers earn by supplying power. Both settle in $PULSAR."
      />

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {/* Consumer flow */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass glass-hover rounded-2xl p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-pulsar-cyan">
              Consumers
            </span>
            <span className="text-xs text-muted-foreground">Pay to run</span>
          </div>
          <h3 className="font-display text-2xl font-bold">Run inference, pay per call</h3>
          <ol className="mt-6 space-y-5">
            {CONSUMER_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-pulsar-cyan/10 text-pulsar-cyan ring-1 ring-pulsar-cyan/30">
                  <s.icon className="size-5" />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-pulsar-cyan text-[10px] font-bold text-cosmos">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{s.title}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* Supplier flow */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass glass-hover rounded-2xl p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-pulsar-violet">
              Suppliers
            </span>
            <span className="text-xs text-muted-foreground">Earn by serving</span>
          </div>
          <h3 className="font-display text-2xl font-bold">Supply GPU, earn rewards</h3>
          <ol className="mt-6 space-y-5">
            {SUPPLIER_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-pulsar-violet/10 text-pulsar-violet ring-1 ring-pulsar-violet/30">
                  <s.icon className="size-5" />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-pulsar-violet text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{s.title}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>

      {/* Protocol fee loop */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        className="mt-6 flex flex-col items-center gap-4 rounded-2xl glass p-6 md:flex-row md:justify-center md:gap-2"
      >
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-foreground">
          Every compute job
        </span>
        <ArrowRight className="size-4 text-muted-foreground rotate-90 md:rotate-0" />
        <span className="rounded-full border border-pulsar-violet/30 bg-pulsar-violet/10 px-4 py-2 text-sm font-medium text-pulsar-violet">
          1% protocol fee in $PULSAR
        </span>
        <ArrowRight className="size-4 text-muted-foreground rotate-90 md:rotate-0" />
        <span className="rounded-full border border-pulsar-cyan/30 bg-pulsar-cyan/10 px-4 py-2 text-sm font-medium text-pulsar-cyan">
          Quarterly buyback-and-burn
        </span>
      </motion.div>
    </section>
  );
}
