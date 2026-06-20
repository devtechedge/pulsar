"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Rocket, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Background } from "@/components/sections/Background";
import { asset } from "@/lib/asset";

// Lazy-load the 3D canvas (client-only) to protect LCP + avoid SSR three.js work.
const Pulsar3D = dynamic(
  () => import("@/components/Pulsar3D").then((m) => m.Pulsar3D),
  { ssr: false, loading: () => null }
);

export default function DocsPage() {
  return (
    <>
      <Background />
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20">
        {/* Background — diffuse nebula glow (no hard edges) */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute left-1/2 top-1/3 h-[120%] w-[120%] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.20) 0%, rgba(124,58,237,0.06) 30%, transparent 55%)",
              filter: "blur(50px)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.10) 0%, transparent 60%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        {/* 3D Pulsar — centered, behind content (desktop only) */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 opacity-50 lg:block">
          <Pulsar3D />
        </div>

        {/* Top bar — logo + back button */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label="Pulsar home"
          >
            <img src={asset("/pulsar.svg")} alt="Pulsar logo" className="h-8 w-8" />
            <span className="font-display text-xl font-bold tracking-tight">
              Pulsar
            </span>
          </Link>
          <Button
            asChild
            variant="ghost"
            className="glass glass-hover rounded-full px-4 py-2 text-sm font-medium text-foreground hover:text-pulsar-cyan"
          >
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 inline-flex size-20 items-center justify-center rounded-2xl glass gradient-border"
          >
            <BookOpen className="size-9 text-pulsar-cyan" />
          </motion.div>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Sparkles className="size-3 text-pulsar-cyan" />
            Pulsar Documentation
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          >
            Coming <span className="text-gradient">Soon</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg"
          >
            The full Pulsar documentation — whitepaper, API reference, smart contract
            specs, integration guides, and node operator handbook — is being assembled.
            We're shipping it alongside the mainnet launch.
          </motion.p>

          {/* "Smooth sailing" animated wave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-12 w-full max-w-md"
          >
            <SailingAnimation />
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button
              asChild
              data-magnetic="true"
              className="group h-12 rounded-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient px-7 text-base font-semibold text-white shadow-lg shadow-pulsar/30 transition-transform hover:scale-[1.02]"
            >
              <Link href="/">
                <Rocket className="size-4" />
                Back to Home
              </Link>
            </Button>
          </motion.div>

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
            </span>
            In progress · ETA: Q3 2026
          </motion.div>
        </motion.div>
      </main>
    </>
  );
}

/**
 * "Smooth sailing" animation — a stylized paper boat riding gentle waves.
 * Pure SVG + Framer Motion. No external assets.
 */
function SailingAnimation() {
  return (
    <div className="relative h-24 w-full">
      <svg
        viewBox="0 0 400 96"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0" />
            <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="boat-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>

        {/* Wave layer 1 (back) */}
        <motion.path
          d="M0 60 Q 50 50, 100 60 T 200 60 T 300 60 T 400 60 L 400 96 L 0 96 Z"
          fill="url(#wave-grad)"
          opacity={0.3}
          animate={{
            d: [
              "M0 60 Q 50 50, 100 60 T 200 60 T 300 60 T 400 60 L 400 96 L 0 96 Z",
              "M0 60 Q 50 70, 100 60 T 200 60 T 300 60 T 400 60 L 400 96 L 0 96 Z",
              "M0 60 Q 50 50, 100 60 T 200 60 T 300 60 T 400 60 L 400 96 L 0 96 Z",
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Wave layer 2 (front) */}
        <motion.path
          d="M0 68 Q 50 60, 100 68 T 200 68 T 300 68 T 400 68 L 400 96 L 0 96 Z"
          fill="url(#wave-grad)"
          opacity={0.5}
          animate={{
            d: [
              "M0 68 Q 50 60, 100 68 T 200 68 T 300 68 T 400 68 L 400 96 L 0 96 Z",
              "M0 68 Q 50 76, 100 68 T 200 68 T 300 68 T 400 68 L 400 96 L 0 96 Z",
              "M0 68 Q 50 60, 100 68 T 200 68 T 300 68 T 400 68 L 400 96 L 0 96 Z",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Paper boat — rides the wave */}
        <motion.g
          animate={{
            y: [0, -4, 0, -3, 0],
            rotate: [-2, 2, -2, 1, -2],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "200px 55px" }}
        >
          {/* Sail */}
          <path d="M200 30 L200 55 L218 55 Z" fill="url(#boat-grad)" />
          {/* Mast */}
          <line x1="200" y1="30" x2="200" y2="58" stroke="#C4B5FD" strokeWidth="1.5" />
          {/* Hull */}
          <path d="M188 58 L212 58 L208 64 L192 64 Z" fill="url(#boat-grad)" />
        </motion.g>
      </svg>
    </div>
  );
}
