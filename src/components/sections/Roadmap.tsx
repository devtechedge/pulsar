"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/SectionHeading";
import { ROADMAP } from "@/lib/contracts";

const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  active: { label: "Active", dot: "bg-emerald-400", text: "text-emerald-300" },
  next: { label: "Next", dot: "bg-pulsar-cyan", text: "text-pulsar-cyan" },
  planned: { label: "Planned", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

export function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="Roadmap"
        title="The path to $5M+ valuation"
        subtitle="Phased milestones from foundation to a fully governed compute economy."
      />

      <div className="relative mt-16">
        {/* vertical gradient rail (desktop) */}
        <div
          aria-hidden
          className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-pulsar-violet via-pulsar to-pulsar-cyan md:block"
        />

        <ol className="space-y-6 md:space-y-0">
          {ROADMAP.map((phase, i) => {
            const meta = STATUS_META[phase.status] ?? STATUS_META.planned;
            const isRight = i % 2 === 1;
            return (
              <li
                key={phase.phase}
                className="relative md:grid md:grid-cols-2 md:gap-12 md:py-6"
              >
                {/* node dot (desktop) */}
                <div
                  aria-hidden
                  className="absolute left-1/2 top-8 hidden size-4 -translate-x-1/2 rounded-full border-2 border-cosmos md:block"
                  style={{
                    background:
                      phase.status === "active"
                        ? "#34D399"
                        : phase.status === "next"
                        ? "#22D3EE"
                        : "#8B5CF6",
                    boxShadow: "0 0 16px rgba(139,92,246,0.6)",
                  }}
                />

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ once: true, margin: "-80px" }}
                  className={
                    "glass glass-hover rounded-2xl p-6 md:p-8 " +
                    (isRight ? "md:col-start-2" : "md:col-start-1")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs uppercase tracking-[0.25em] text-pulsar-cyan">
                      {phase.phase}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
                      <span className={`size-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-bold">{phase.name}</h3>
                  <ul className="mt-4 space-y-2">
                    {phase.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
