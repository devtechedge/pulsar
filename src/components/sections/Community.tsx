"use client";

import { motion } from "framer-motion";
import {
  Twitter,
  Send,
  MessageCircle,
  Github,
  BookOpen,
  FileText,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { SOCIALS } from "@/lib/contracts";

interface Social {
  icon: LucideIcon;
  name: string;
  description: string;
  href: string;
  external: boolean;
}

const ITEMS: Social[] = [
  { icon: Twitter, name: "X (Twitter)", description: "Real-time updates", href: SOCIALS.x },
  { icon: Send, name: "Telegram", description: "Trader chat", href: SOCIALS.telegram },
  { icon: MessageCircle, name: "Discord", description: "Builder chat", href: SOCIALS.discord },
  { icon: Github, name: "GitHub", description: "Source code & contracts", href: SOCIALS.github },
  { icon: BookOpen, name: "Docs", description: "Whitepaper & API", href: SOCIALS.docs },
  { icon: FileText, name: "Medium", description: "Long-form posts", href: SOCIALS.medium },
].map((s) => ({
  ...s,
  // Internal links (starting with /) should not open in a new tab.
  external: !s.href.startsWith("/"),
}));

export function Community() {
  return (
    <section id="community" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="Community"
        title="Join the network"
        subtitle="Builders, suppliers, and validators — pick your lane."
      />

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {ITEMS.map((s, i) => (
          <motion.a
            key={s.name}
            href={s.href}
            target={s.external ? "_blank" : undefined}
            rel={s.external ? "noreferrer" : undefined}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.06 }}
            viewport={{ once: true, margin: "-80px" }}
            className="glass glass-hover group flex items-center justify-between rounded-2xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="inline-flex size-12 items-center justify-center rounded-xl bg-white/5 text-pulsar-cyan ring-1 ring-white/10 transition-colors group-hover:text-pulsar-violet group-hover:ring-pulsar-violet/30">
                <s.icon className="size-6" />
              </div>
              <div>
                <div className="font-display text-lg font-bold">{s.name}</div>
                <div className="text-sm text-muted-foreground">{s.description}</div>
              </div>
            </div>
            <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-pulsar-cyan" />
          </motion.a>
        ))}
      </div>
    </section>
  );
}
