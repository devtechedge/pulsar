/**
 * Centralized Pulsar contract config + ABIs + tokenomics constants.
 * Used by the website + dashboard.
 */

import { PULSAR_TOKEN, PULSAR_STAKING, UNISWAP_V2_PAIR } from "./wagmi";

// --- ABIs (minimal subset for UI; full ABIs in /contracts/abi/) ---

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export const pulsarAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "buyTaxBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sellTaxBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "treasuryTaxShareBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "liquidityTaxShareBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "burnTaxShareBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "burn",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tradingEnabled",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "limitsInEffect",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

export const stakingAbi = [
  {
    type: "function",
    name: "stake",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unstake",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "exit",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "earned",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalStaked",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rewardRate",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "periodFinish",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currentAPYBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userInfo",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "rewardDebt", type: "uint256" },
      { name: "pendingRewards", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

// --- Contract addresses (re-exported for convenience) ---

export const PULSAR = {
  token: PULSAR_TOKEN,
  staking: PULSAR_STAKING,
  pair: UNISWAP_V2_PAIR,
} as const;

// --- Tokenomics constants ---

export const TOKENOMICS = {
  totalSupply: 1_000_000_000,
  decimals: 18,
  symbol: "PULSAR",
  name: "Pulsar",
  chain: "Base",
  chainId: 8453,

  buyTaxBps: 200, // 2%
  sellTaxBps: 200, // 2%
  maxTaxBps: 500, // 5% hard cap

  taxShares: {
    treasury: 5000, // 50% of tax
    liquidity: 2500, // 25% of tax
    burn: 2500, // 25% of tax
  },

  allocations: [
    { name: "Ecosystem & Compute Rewards", pct: 35, supply: 350_000_000, color: "var(--chart-1)", vesting: "Released over time as network grows", locked: false },
    { name: "Liquidity", pct: 20, supply: 200_000_000, color: "var(--chart-2)", vesting: "12-month lock via UNCX", locked: true },
    { name: "Team & Advisors", pct: 15, supply: 150_000_000, color: "var(--chart-3)", vesting: "6-mo cliff, 24-mo linear vest", locked: true },
    { name: "Marketing & Partnerships", pct: 12, supply: 120_000_000, color: "var(--chart-4)", vesting: "Released against milestones", locked: true },
    { name: "Treasury / DAO Reserve", pct: 10, supply: 100_000_000, color: "var(--chart-5)", vesting: "Multisig-governed", locked: true },
    { name: "Presale / Early Supporters", pct: 8, supply: 80_000_000, color: "#94A3B8", vesting: "10% at TGE, 6-mo vest", locked: true },
  ] as const,

  // live stats — initially set to demo values; the UI hydrates from on-chain when IS_LIVE
  burnedSupply: 12_500_000, // demo: 12.5M burned
  holders: 4287,
  lpLockedMonths: 12,
} as const;

export const ROADMAP = [
  {
    phase: "Phase 1",
    name: "Foundation",
    status: "active",
    items: [
      "Smart contract deployed & verified on Basescan",
      "Hacken audit + KYC badge",
      "Marketing website v1 live",
      "Liquidity locked 12 months via UNCX",
      "Uniswap V2 launch on Base",
    ],
  },
  {
    phase: "Phase 2",
    name: "Utility Live",
    status: "next",
    items: [
      "Staking dashboard live",
      "First compute-provider integration (whitelabel)",
      "Real compute jobs settled in $PULSAR",
      "Public burn tracker + on-chain proof",
    ],
  },
  {
    phase: "Phase 3",
    name: "Growth",
    status: "planned",
    items: [
      "Tier-2 CEX listings",
      "Strategic partnerships with AI labs",
      "CertiK audit",
      "KOL + community campaigns",
    ],
  },
  {
    phase: "Phase 4",
    name: "Scale",
    status: "planned",
    items: [
      "Full compute marketplace",
      "DAO governance over compute pricing",
      "Real revenue → quarterly buyback-and-burn",
      "Cross-chain settlement layer",
    ],
  },
  {
    phase: "Phase 5",
    name: "$5M+ Valuation",
    status: "planned",
    items: [
      "Sustained real utility & revenue",
      "Deep DEX + CEX liquidity",
      "Tier-1 CEX listing",
      "Active, governed DAO",
    ],
  },
] as const;

export const SOCIALS = {
  x: "https://x.com",
  telegram: "https://telegram.org",
  discord: "https://discord.com",
  github: "https://github.com",
  docs: "/docs",
  medium: "https://medium.com",
} as const;

export const TRUST = {
  auditFirm: "Hacken",
  auditStatus: "In Progress",
  kycFirm: "Assure Defy",
  liquidityLocker: "UNCX",
  liquidityLockMonths: 12,
  multisig: "Gnosis Safe on Base",
} as const;
