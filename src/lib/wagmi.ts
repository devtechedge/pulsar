"use client";

import { http, createConfig, WagmiConfig, type CreateConfigParameters } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

/**
 * Wagmi + RainbowKit config for Pulsar.
 * Default chain: Base (chainId 8453).
 */

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "pulsar-demo-project-id";

export const chains = [base, baseSepolia] as const;

export const config = getDefaultConfig({
  appName: "Pulsar",
  // @ts-expect-error RainbowKit accepts single chain or array
  chains: chains,
  projectId,
  ssr: true,
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
    ),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
        "https://sepolia.base.org"
    ),
  },
}) as unknown as CreateConfigParameters;

// re-export for convenience
export type { WagmiConfig };

// ---------------------------------------------------------------------------
// Contract addresses (populated from env, with placeholder zero addresses
// that the UI gracefully degrades on when not set).
// ---------------------------------------------------------------------------

export const PULSAR_TOKEN =
  process.env.NEXT_PUBLIC_PULSAR_TOKEN ||
  "0x0000000000000000000000000000000000000000";

export const PULSAR_STAKING =
  process.env.NEXT_PUBLIC_PULSAR_STAKING ||
  "0x0000000000000000000000000000000000000000";

export const UNISWAP_V2_PAIR =
  process.env.NEXT_PUBLIC_UNISWAP_V2_PAIR ||
  "0x0000000000000000000000000000000000000000";

/** True when a real deployed token address has been provided. */
export const IS_LIVE =
  PULSAR_TOKEN !== "0x0000000000000000000000000000000000000000";

export const BASE_CHAIN_ID = base.id;
export const BASE_CHAIN = base;
export const BASE_EXPLORER = "https://basescan.org";
