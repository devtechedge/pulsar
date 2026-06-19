<div align="center">

<img src="public/pulsar.svg" width="80" height="80" alt="Pulsar logo" />

# PULSAR

### The signal layer for decentralized AI compute

`$PULSAR` — a utility token on Base. Pay to run AI inference. Earn by supplying GPU power. Deflationary by design.

[Website](#) · [Smart Contracts](./contracts) · [Deploy Guide](./DEPLOY.md) · [Tokenomics](#tokenomics)

</div>

---

## Overview

PULSAR is a full-stack Web3 marketing site + smart contract system for a decentralized AI compute network. Consumers pay `$PULSAR` to run AI models (LLMs, image, voice, vision); node operators earn `$PULSAR` for contributing GPU power; a protocol fee on every job funds a quarterly buyback-and-burn.

This repo contains both the production-grade Next.js marketing site and the Foundry-deployable ERC-20 + staking contracts.

> **Status:** Step 1 complete — website production-ready, contracts audit-ready. Live deploy requires setting 4 env vars (see [DEPLOY.md](./DEPLOY.md)).

---

## Highlights

- **3D hero** — React-Three-Fiber neutron-star with polar jets, accretion disk, and animated pulse rings (mobile fallback for LCP).
- **Wallet connect** — wagmi v3 + viem + RainbowKit v2 on Base mainnet (with Base Sepolia fallback).
- **Staking dashboard** — wallet-aware UI with full approve → stake → unstake → claim → exit flow, 18-decimal safe math, live APY read from contract.
- **Tokenomics visuals** — Recharts donut (allocation) + bar (vesting), animated burned-supply counter, tax breakdown, vesting schedule table.
- **10 polished sections** — Hero, About, How It Works, Tokenomics, Utility, Roadmap, How to Buy, Staking, Trust & Security, Community.
- **Smart contracts** — `Pulsar.sol` (ERC-20, fixed 1B supply, 2%/2% tax with 5/5 cap, anti-bot limits, manual burn, not upgradeable) + `PulsarStaking.sol` (single-asset staking with configurable APY). 14 Foundry unit tests.
- **Trust primitives** — verified-on-Basescan badge, UNCX liquidity lock proof, Gnosis Safe multisig, on-chain vesting, KYC badge, Hacken audit hook.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Animation | Framer Motion 12 |
| 3D | three.js + @react-three/fiber + @react-three/drei |
| Charts | Recharts 2 |
| Web3 | wagmi v3 + viem v2 + RainbowKit v2 |
| Icons | lucide-react |
| Contracts | Solidity 0.8.24 + OpenZeppelin + Foundry |
| Chain | Base (chainId 8453) |

---

## Repo structure

```
.
├── src/                          # Next.js app
│   ├── app/                      # layout.tsx, page.tsx, globals.css
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── sections/             # 10 marketing sections
│   │   ├── Pulsar3D.tsx          # R3F neutron star
│   │   ├── ConnectButton.tsx     # RainbowKit custom wrapper
│   │   └── ...                   # SectionHeading, CopyButton, etc.
│   └── lib/                      # wagmi config, contract ABIs, format utils
│
├── contracts/                    # Foundry project
│   ├── src/
│   │   ├── Pulsar.sol            # ERC-20 token
│   │   └── PulsarStaking.sol     # Staking vault
│   ├── script/Deploy.s.sol       # Deployment script
│   ├── test/Pulsar.t.sol         # 14 unit tests
│   ├── abi/                      # Generated ABIs (committed for frontend use)
│   └── foundry.toml
│
├── public/                       # pulsar.svg, favicon.svg, robots.txt
├── DEPLOY.md                     # Step-by-step Vercel + GitHub deploy guide
├── .env.example                  # Environment variables for going live
└── README.md                     # This file
```

---

## Tokenomics

| Allocation | % | Supply | Vesting |
|---|---|---|---|
| Ecosystem & compute rewards | 35% | 350,000,000 | Released over time as network grows |
| Liquidity (DEX pair) | 20% | 200,000,000 | 12-month lock via UNCX |
| Team & advisors | 15% | 150,000,000 | 6-mo cliff, 24-mo linear vest |
| Marketing & partnerships | 12% | 120,000,000 | Released against milestones |
| Treasury / DAO reserve | 10% | 100,000,000 | Multisig-governed |
| Presale / early supporters | 8% | 80,000,000 | 10% at TGE, 6-mo vest |

- **Total supply:** 1,000,000,000 `$PULSAR` (1B), fixed, no mint.
- **Tax:** 2% buy / 2% sell (cap 5/5, reducible to 0/0). Split: 50% treasury · 25% liquidity · 25% burn.
- **Deflation:** protocol fees from compute jobs fund quarterly buyback-and-burn.

---

## Quick start (local dev)

```bash
# 1. Install deps
bun install

# 2. (Optional) Set env vars to flip the site to "live" mode
cp .env.example .env.local
# fill in NEXT_PUBLIC_PULSAR_TOKEN, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, etc.

# 3. Run dev server
bun run dev
# → http://localhost:3000

# 4. Lint
bun run lint

# 5. (Optional) Smart contracts
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
forge test -vv
```

---

## Deployment

Two free hosting options — both work from the same codebase, no refactor needed:

| | GitHub Pages | Vercel |
|---|---|---|
| Lives in your repo | ✅ | ❌ (external) |
| Best for portfolio | ✅ | |
| Best for future server features | | ✅ |
| Setup | One workflow + 1 secret | Import repo + 1 env var |
| URL | `username.github.io/pulsar/` | `pulsar-username.vercel.app` |

**Full step-by-step for both:** see [`DEPLOY.md`](./DEPLOY.md).

The site is **fully static** (no API routes, no database, no auth) — reads happen client-side via wagmi/viem on Base mainnet. `next.config.ts` is conditional: it produces a standard build for Vercel and a static `out/` export for GitHub Pages, switched by the `GITHUB_PAGES=1` env var.

- **Website:** GitHub Pages or Vercel (see [`DEPLOY.md`](./DEPLOY.md))
- **Contracts:** Foundry → Base mainnet (see [`contracts/README.md`](./contracts/README.md))
- **No database required** — fully static + client-side Web3

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Foundation: contract, Hacken audit, KYC, website v1, liquidity lock, Uniswap launch | **Active** |
| 2 | Utility live: staking dashboard, first compute-provider integration | Next |
| 3 | Growth: tier-2 CEX listings, partnerships, CertiK audit, KOL campaigns | Planned |
| 4 | Scale: full compute marketplace, DAO governance, real revenue → buyback/burn | Planned |
| 5 | $5M+: sustained utility, deep liquidity, tier-1 CEX listing, active DAO | Planned |

---

## Trust & security

- **Audit:** Hacken (Phase 1) → CertiK (Phase 3)
- **KYC:** Assure Defy
- **Liquidity lock:** UNCX, 12-month minimum
- **Multisig:** Gnosis Safe on Base for team + treasury wallets
- **Vesting:** On-chain, public, with proof links
- **Contract source:** Verified on Basescan, not upgradeable

---

## Disclaimer

`$PULSAR` is a **utility token**, not a security. Nothing in this repository is financial advice. Token allocations, vesting schedules, and tax parameters are configurable by the multisig post-launch per the public tokenomics schedule.

---

## License

MIT — see [`LICENSE`](./LICENSE).
