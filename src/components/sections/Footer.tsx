"use client";

import Link from "next/link";
import { Twitter, Send, MessageCircle, Github, ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { SOCIALS } from "@/lib/contracts";
import { IS_LIVE, PULSAR_TOKEN, BASE_EXPLORER } from "@/lib/wagmi";
import { truncateAddress } from "@/lib/format";
import { asset } from "@/lib/asset";

const EXPLORE = [
  { href: "#about", label: "About" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#tokenomics", label: "Tokenomics" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#how-to-buy", label: "How to Buy" },
  { href: "#staking", label: "Staking" },
];

const NETWORK = [
  { href: "#console", label: "Compute Console" },
  { href: "#suppliers", label: "Supplier Registry" },
  { href: "#marketplace", label: "Model Marketplace" },
  { href: "#pulse", label: "Network Pulse" },
  { href: "#oracle", label: "Pricing Oracle" },
  { href: "#vesting", label: "Vesting Calendar" },
  { href: "#burn", label: "Burn Tracker" },
  { href: "#metrics", label: "Token Metrics" },
  { href: "#bridge", label: "Bridge" },
  { href: "#governance", label: "DAO Governance" },
];

const RESOURCES = [
  { href: SOCIALS.docs, label: "Docs", external: true },
  { href: IS_LIVE ? `${BASE_EXPLORER}/address/${PULSAR_TOKEN}` : BASE_EXPLORER, label: "Basescan", external: true },
  {
    href: IS_LIVE
      ? `https://app.uniswap.org/swap?chain=base&inputCurrency=ETH&outputCurrency=${PULSAR_TOKEN}`
      : "https://app.uniswap.org/swap?chain=base",
    label: "Uniswap",
    external: true,
  },
  { href: SOCIALS.github, label: "GitHub", external: true },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-cosmos/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* top grid */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src={asset("/pulsar.svg")} alt="Pulsar logo" className="h-8 w-8" />
              <span className="font-display text-xl font-bold">Pulsar</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
              The signal layer for decentralized AI compute. Pay $PULSAR to run
              models. Earn $PULSAR by supplying GPU power. On Base.
            </p>
            {IS_LIVE ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                {truncateAddress(PULSAR_TOKEN, 6)}
                <CopyButton value={PULSAR_TOKEN} label="Copy contract address" className="size-6" />
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                Contract: deploying at TGE
              </div>
            )}
          </div>

          {/* Explore */}
          <nav aria-label="Explore" className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Explore
            </h3>
            {EXPLORE.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-foreground/80 transition-colors hover:text-pulsar-cyan"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Resources */}
          <nav aria-label="Resources" className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Resources
            </h3>
            {RESOURCES.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noreferrer" : undefined}
                className="inline-flex items-center gap-1.5 text-sm text-foreground/80 transition-colors hover:text-pulsar-cyan"
              >
                {l.label}
                {l.external && <ExternalLink className="size-3" />}
              </a>
            ))}
          </nav>

          {/* Network */}
          <nav aria-label="Network" className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Network
            </h3>
            {NETWORK.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-foreground/80 transition-colors hover:text-pulsar-cyan"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Community */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Community
            </h3>
            <div className="flex gap-2">
              {[
                { icon: Twitter, href: SOCIALS.x, label: "X" },
                { icon: Send, href: SOCIALS.telegram, label: "Telegram" },
                { icon: MessageCircle, href: SOCIALS.discord, label: "Discord" },
                { icon: Github, href: SOCIALS.github, label: "GitHub" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="inline-flex size-10 items-center justify-center rounded-lg glass text-muted-foreground transition-colors hover:text-pulsar-cyan hover:border-pulsar/40"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* bottom row */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/5 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            © 2026 Pulsar Compute. Not financial advice. $PULSAR is a utility
            token, not a security. Always do your own research.
          </p>
          {IS_LIVE ? (
            <a
              href={`${BASE_EXPLORER}/address/${PULSAR_TOKEN}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-pulsar-cyan hover:underline"
            >
              {truncateAddress(PULSAR_TOKEN, 6)}
              <ExternalLink className="size-3" />
              Basescan
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
