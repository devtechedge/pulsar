"use client";

import { motion } from "framer-motion";
import { CloudOff, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const STATS = [
  { value: "1B", label: "Fixed supply" },
  { value: "2% / 2%", label: "Buy / sell tax (cap 5/5)" },
  { value: "12 mo", label: "Liquidity lock" },
];

export function About() {
  return (
    <section id="about" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="About"
        title="The problem and the pulse"
        subtitle="AI compute is locked behind a few cloud giants. Pulsar opens it up — and settles every job on-chain."
      />

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {/* Problem card */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass glass-hover rounded-2xl p-8"
        >
          <div className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-pulsar-violet/15 text-pulsar-violet ring-1 ring-pulsar-violet/30">
            <CloudOff className="size-6" />
          </div>
          <h3 className="font-display text-2xl font-bold md:text-3xl">
            AI compute is centralized &amp; expensive.
          </h3>
          <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A handful of hyperscalers control the vast majority of GPU supply,
              and they price it opaquely. Spot rates swing by the hour, Reserved
              Instance discounts lock developers into multi-year commitments, and
              the underlying cost of running inference is impossible to audit. The
              result is a market where the supplier always wins and the builder
              always pays.
            </p>
            <p>
              For teams shipping AI products, this is more than an annoyance — it
              is structural leverage working against them. A single provider can
              deprecate an instance class, throttle throughput, or hike pricing
              with thirty days notice. There is no fallback, no transparency, and
              no recourse. Builders absorb the risk and pass the cost to users.
            </p>
            <p>
              Worse, idle GPU capacity sits everywhere — in gaming rigs, in
              research labs, in data centers off-peak — but it cannot reach the
              market. The plumbing to discover, price, and settle compute jobs
              between strangers simply does not exist in the centralized stack.
            </p>
          </div>
        </motion.article>

        {/* Solution card */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          viewport={{ once: true, margin: "-80px" }}
          className="glass glass-hover rounded-2xl p-8"
        >
          <div className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-pulsar-cyan/15 text-pulsar-cyan ring-1 ring-pulsar-cyan/30">
            <Sparkles className="size-6" />
          </div>
          <h3 className="font-display text-2xl font-bold md:text-3xl">
            Pulsar decentralizes it.
          </h3>
          <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Pulsar is an open marketplace for GPU power. Anyone with a capable
              card can register as a supplier; anyone with a wallet can request
              inference. Pricing is transparent, published on-chain, and
              settled atomically in $PULSAR for every completed job.
            </p>
            <p>
              The token is the settlement layer — not a voucher, not a points
              system. Every model call is a real transaction: a consumer pays,
              a supplier is paid, and a small protocol fee is routed to the
              treasury. No middleman skims, no platform holds the float.
            </p>
            <p>
              Deflationary pressure is built in. A share of every protocol fee
              funds a quarterly buyback-and-burn of $PULSAR, so as network usage
              grows the circulating supply shrinks. Utility and scarcity, on the
              same rail, enforced by code.
            </p>
          </div>
        </motion.article>
      </div>

      {/* Stat strip */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        className="mt-6 grid gap-4 sm:grid-cols-3"
      >
        {STATS.map((s) => (
          <div key={s.label} className="glass glass-hover rounded-2xl p-6 text-center">
            <div className="font-display text-3xl font-bold text-gradient md:text-4xl">
              {s.value}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
