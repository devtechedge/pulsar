"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Users,
  Check,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { TRUST } from "@/lib/contracts";

const CARDS = [
  {
    icon: ShieldCheck,
    title: `${TRUST.auditFirm} audit — ${TRUST.auditStatus}`,
    body: "Independent smart-contract audit covering the token, staking, and tax logic. CertiK scheduled for Phase 3 to support tier-2 CEX listings.",
    tint: "violet",
  },
  {
    icon: UserCheck,
    title: `${TRUST.kycFirm} KYC`,
    body: "Core team identities verified by Assure Defy. KYC badge displayed on-site and linked from the project README.",
    tint: "cyan",
  },
  {
    icon: Lock,
    title: `${TRUST.liquidityLocker} · ${TRUST.liquidityLockMonths} months`,
    body: "Initial liquidity locked via UNCX for 12 months. Lock proof is published on Basescan and verifiable from the LP token contract.",
    tint: "violet",
  },
  {
    icon: Users,
    title: TRUST.multisig,
    body: "Treasury and team allocations governed by a Gnosis Safe on Base. No single signer can move funds or upgrade parameters unilaterally.",
    tint: "cyan",
  },
];

const CHECKLIST = [
  "Contract source verified on Basescan",
  "Liquidity locked via UNCX (12 months)",
  "Team allocation vested on-chain (6-mo cliff, 24-mo linear)",
  "Treasury governed by Gnosis Safe multisig",
  "Ownership transfer to multisig post-launch",
];

export function Trust() {
  return (
    <section id="trust" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="Trust & Security"
        title="Built to be audited, governed, and trusted"
        subtitle="No shortcuts. Audit, KYC, liquidity lock, multisig, on-chain vesting."
      />

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c, i) => (
          <motion.article
            key={c.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
            viewport={{ once: true, margin: "-80px" }}
            className="glass glass-hover rounded-2xl p-6"
          >
            <div
              className={
                "mb-5 inline-flex size-12 items-center justify-center rounded-xl ring-1 " +
                (c.tint === "violet"
                  ? "bg-pulsar-violet/15 text-pulsar-violet ring-pulsar-violet/30"
                  : "bg-pulsar-cyan/15 text-pulsar-cyan ring-pulsar-cyan/30")
              }
            >
              <c.icon className="size-6" />
            </div>
            <h3 className="font-display text-base font-bold leading-snug">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
          </motion.article>
        ))}
      </div>

      {/* Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        className="mt-6 glass rounded-2xl p-6 md:p-8"
      >
        <h3 className="font-display text-xl font-bold">Trust checklist</h3>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30">
                <Check className="size-3.5" />
              </span>
              <span className="text-sm text-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <a
          href="https://docs.pulsarcompute.xyz/security"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-pulsar-cyan hover:underline"
        >
          Read the security docs
          <ArrowRight className="size-4" />
        </a>
      </motion.div>
    </section>
  );
}
