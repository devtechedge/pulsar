<div align="center">

# <img src="public/pulsar.svg" width="48" height="48" alt="Pulsar logo" /> PULSAR

**The signal layer for decentralized AI compute**

Pay `$PULSAR` to run AI inference. Earn by supplying GPU power. Deflationary by design.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-black?logo=github)](https://devtechedge.github.io/pulsar/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Base](https://img.shields.io/badge/Base-8453-0052FF?logo=coinbase)](https://base.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

## Live Demo

**https://devtechedge.github.io/pulsar/**

> **Status:** Frontend + client-side Web3 is live. Smart contracts are audit-ready but not yet deployed to Base (pre-TGE). The UI uses realistic mock data and wallet-connect flows so the product experience is fully reviewable today.

## Screenshots

| Hero + 3D neutron star | How it works |
|:---:|:---:|
| ![Hero](docs/screenshots/Screenshot%202026-07-27%20042906.png) | ![How it works](docs/screenshots/Screenshot%202026-07-27%20042925.png) |

| Tokenomics | Live network pulse |
|:---:|:---:|
| ![Tokenomics](docs/screenshots/Screenshot%202026-07-27%20042931.png) | ![Network](docs/screenshots/Screenshot%202026-07-27%20042955.png) |

## Features

- **3D hero** — React Three Fiber neutron star with polar jets, accretion disk, and animated pulse rings
- **Wallet connect** — wagmi v3 + RainbowKit on Base (mainnet + Sepolia fallback)
- **Staking dashboard** — full approve → stake → unstake → claim flow with live APY reads
- **Tokenomics visuals** — Recharts allocation donut, vesting bars, animated burned-supply counter
- **Live network pulse** — simulated job feed, supplier map, latency & volume KPIs
- **Trust primitives** — Basescan verification hooks, UNCX lock proof, Gnosis Safe, KYC badge
- **Smart contracts** — `Pulsar.sol` (fixed 1B supply, tax + burn) + `PulsarStaking.sol` (Foundry + 14 tests)

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| 3D / Motion | three.js + @react-three/fiber + Framer Motion |
| Charts | Recharts |
| Web3 | wagmi v3 + viem + RainbowKit |
| Contracts | Solidity 0.8.24 + OpenZeppelin + Foundry |
| Chain | Base (8453) |

## Quick Start

```bash
bun install
bun run dev          # → http://localhost:3000

# Optional — contracts
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build && forge test -vv
```

Copy `.env.example` → `.env.local` and fill the four public vars when you are ready to point the UI at a live contract address.

## Smart Contracts

See [`contracts/`](./contracts) for the full Foundry project, ABIs, deployment scripts, and audit notes. Deployment guide: [`DEPLOY.md`](./DEPLOY.md).

## License

MIT — see [LICENSE](./LICENSE).
