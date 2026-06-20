"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceTicker } from "@/components/PriceTicker";
import { CopyButton } from "@/components/CopyButton";
import { IS_LIVE, PULSAR_TOKEN, BASE_EXPLORER } from "@/lib/wagmi";
import { truncateAddress } from "@/lib/format";

// Lazy-load the 3D canvas (client-only) to protect LCP + avoid SSR three.js work.
const Pulsar3D = dynamic(
  () => import("@/components/Pulsar3D").then((m) => m.Pulsar3D),
  { ssr: false, loading: () => null }
);

export function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
    >
      {/* Mobile background glow — multi-layer diffuse nebula that blends into the page.
          No hard edges, no visible circle. Just a soft atmospheric wash that fades
          naturally into the background on all sides. Hidden on lg+ (desktop uses 3D). */}
      <div className="pointer-events-none absolute inset-0 md:hidden lg:hidden" aria-hidden>
        {/* Layer 1: large soft violet wash, top-right */}
        <div
          className="absolute -right-32 -top-24 h-[140%] w-[140%] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 70% 30%, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 30%, transparent 55%)",
            filter: "blur(40px)",
          }}
        />
        {/* Layer 2: cyan accent, offset to create depth */}
        <div
          className="absolute -right-20 top-10 h-[80%] w-[80%] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 60% 40%, rgba(34,211,238,0.10) 0%, rgba(34,211,238,0.03) 35%, transparent 60%)",
            filter: "blur(50px)",
          }}
        />
        {/* Layer 3: faint magenta edge bloom for richness */}
        <div
          className="absolute right-0 top-1/3 h-[60%] w-[60%] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(244,114,182,0.06) 0%, transparent 50%)",
            filter: "blur(60px)",
          }}
        />
        {/* Layer 4: subtle pulse rings emanating outward — on-brand Pulsar visual,
            but extremely faint so they read as atmosphere, not a graphic */}
        <div
          className="absolute right-8 top-1/4 size-48 rounded-full border border-pulsar-violet/10 animate-pulse-ring"
          style={{ animationDelay: "0s", animationDuration: "5s" }}
        />
        <div
          className="absolute right-8 top-1/4 size-48 rounded-full border border-pulsar-cyan/10 animate-pulse-ring"
          style={{ animationDelay: "2s", animationDuration: "5s" }}
        />
      </div>

      <div className="relative grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        {/* LEFT — copy + CTAs (full width on mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full flex-col gap-5 sm:gap-6"
        >
          {/* eyebrow */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Base · ERC-20 · Utility Token
          </div>

          {/* H1 */}
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            The <span className="text-gradient">signal layer</span> for decentralized AI compute.
          </h1>

          {/* subhead */}
          <p className="max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
            Pay $PULSAR to run AI inference. Earn $PULSAR by supplying GPU power.
            Deflationary by design — every compute job is a pulse of intelligence
            across the network.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild data-magnetic="true" className="group h-12 rounded-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient px-7 text-base font-semibold text-white shadow-lg shadow-pulsar/30 transition-transform hover:scale-[1.02]">
              <Link href="#how-to-buy">
                Buy $PULSAR
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="gradient-border group h-12 rounded-full glass px-7 text-base font-semibold text-foreground hover:text-pulsar-cyan"
            >
              <Link href="#staking">
                <Rocket className="size-4" />
                Launch App
              </Link>
            </Button>
          </div>

          {/* price ticker + verified */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PriceTicker />
            {IS_LIVE ? (
              <Link
                href={`${BASE_EXPLORER}/address/${PULSAR_TOKEN}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-400/20"
              >
                <BadgeCheck className="size-3.5" />
                Verified
              </Link>
            ) : null}
          </div>

          {/* contract pill */}
          {IS_LIVE ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {truncateAddress(PULSAR_TOKEN, 6)}
              </span>
              <CopyButton value={PULSAR_TOKEN} label="Copy contract address" />
            </div>
          ) : (
            <div className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
              Contract: deploying at TGE
            </div>
          )}
        </motion.div>

        {/* RIGHT — 3D Pulsar (desktop only).
            On mobile, the background orb above handles the visual.
            This column is hidden below lg to avoid taking vertical space. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="relative mx-auto hidden aspect-square w-full max-w-[520px] lg:block"
          aria-hidden
        >
          {/* Concentric pulse rings (behind canvas) */}
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pulsar/30 animate-pulse-ring" style={{ animationDelay: "0s" }} />
            <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pulsar-cyan/30 animate-pulse-ring" style={{ animationDelay: "1.3s" }} />
            <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pulsar-violet/30 animate-pulse-ring" style={{ animationDelay: "2.6s" }} />
          </div>
          {/* 3D canvas — desktop only */}
          <div className="absolute inset-0">
            <Pulsar3D />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
