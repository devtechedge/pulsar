"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ExternalLink, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { CopyButton } from "@/components/CopyButton";
import { IS_LIVE, PULSAR_TOKEN, BASE_EXPLORER } from "@/lib/wagmi";

const STEPS = [
  {
    n: "01",
    title: "Get ETH on Coinbase",
    body: "Buy ETH on Coinbase, then bridge to Base — or use Coinbase's built-in Base network withdrawal to skip the bridge entirely. Either path lands spendable ETH on Base in minutes.",
  },
  {
    n: "02",
    title: "Fund a Base wallet",
    body: "Send ETH to your wallet of choice (MetaMask, Rainbow, or Coinbase Wallet) on the Base network. You will need roughly $5 of ETH to cover gas for a few transactions.",
  },
  {
    n: "03",
    title: "Swap on Uniswap",
    body: "Open Uniswap on Base, paste the $PULSAR contract address, and swap ETH for $PULSAR. Use 1–2% slippage to account for the protocol tax and pool depth.",
  },
  {
    n: "04",
    title: "Add to wallet & verify",
    body: "Import $PULSAR as a custom token in your wallet, verify the contract on Basescan matches the official address, and you are ready to stake, spend, or hold.",
  },
];

export function HowToBuy() {
  return (
    <section id="how-to-buy" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="How to buy"
        title="Four steps to your first $PULSAR"
        subtitle="All you need is a Base wallet and a little ETH for gas."
      />

      <ol className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
            viewport={{ once: true, margin: "-80px" }}
            className="glass glass-hover relative flex flex-col rounded-2xl p-6"
          >
            <span className="font-display text-5xl font-bold text-gradient">{s.n}</span>
            <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </motion.li>
        ))}
      </ol>

      {/* callout */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        className="mt-6 flex flex-col gap-4 rounded-2xl glass p-6 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h3 className="font-display text-lg font-bold">Official $PULSAR contract</h3>
          {IS_LIVE ? (
            <>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {PULSAR_TOKEN}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Always verify the address on Basescan before swapping. Pulsar team will never DM you a contract.
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Contract deploys at TGE. The official address will be pinned here and across all verified channels at launch.
            </p>
          )}
        </div>
        {IS_LIVE ? (
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={PULSAR_TOKEN} label="Copy contract address" />
            <Link
              href={`${BASE_EXPLORER}/address/${PULSAR_TOKEN}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-pulsar-cyan"
            >
              Basescan <ExternalLink className="size-3.5" />
            </Link>
            <Link
              href={`https://app.uniswap.org/swap?chain=base&inputCurrency=ETH&outputCurrency=${PULSAR_TOKEN}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            >
              Open Uniswap <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}
