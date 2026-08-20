# Security Assessment — Pulsar

**Date:** 2026-08-21  
**Scope:** Auth, XSS, injection, CORS, secrets, Web3 surface, dependency risk  
**Context:** Public deploy is a **static Next.js marketing site + client-side Web3** on GitHub Pages (`https://devtechedge.github.io/pulsar/`). Smart contracts are **audit-ready but not deployed** (pre-TGE). There is **no application backend**.

---

## Executive summary

| Area | Risk | Notes |
|------|------|--------|
| Authentication | **N/A (by design)** | No user accounts, no NextAuth, no sessions |
| Authorization | **N/A** | No mutating HTTP APIs |
| XSS | **Low** | Theme FOUC script is a trusted constant; UI copy is React text |
| Injection (SQL) | **N/A** | Prisma/SQLite template **removed**; no database |
| Wallet / Web3 | **Accepted** | WalletConnect + wagmi; user signs their own txs |
| Secrets in repo | **Low** | Only `NEXT_PUBLIC_*` placeholders; no private keys |
| CORS | **N/A** | Static export / Pages; no custom API origin |
| Build config | **Hardened** | `ignoreBuildErrors` is **false** — type errors fail CI/build |

**Overall (public GitHub Pages demo):** Low residual risk — browser-only UI, mock telemetry, wallet connect is optional, contracts not live.

**Overall (if contracts go live without changing this model):** Medium — users can approve/stake via their wallet. Treat staking UI as a thin untrusted client; security lives in the Solidity contracts (`contracts/AUDIT.md`).

---

## 1. Authentication & session

**Findings**
- Public site requires no login (expected for a pre-TGE marketing demo).
- Template leftovers (`next-auth`, Prisma `User`/`Post`, `src/lib/db.ts`) have been **removed**.

**Verdict:** Auth is intentionally absent. Do not claim “secured with NextAuth”.

**If auth is added later:** never gate on-chain actions with a client-only flag; keep wallet signatures as the source of truth.

---

## 2. Injection (SQL / env / address)

**Findings**
- No SQL on any path.
- Contract addresses come from `NEXT_PUBLIC_PULSAR_*` env vars with zero-address fallbacks.
- `IS_LIVE` is derived from an allow-shape check (`0x` + 40 hex chars, not the zero address). Malformed env values do not flip the site into “live” mode.

**Hardening applied**
- `src/lib/validation.ts` — hex-address + zero-address guards used by `src/lib/wagmi.ts`.
- Buy/sell tax constants are capped in code (`maxTaxBps: 500`); unit tests assert allocation and tax-share sums.

---

## 3. XSS

**Findings**
- `dangerouslySetInnerHTML` is used **once**, for the trusted `themeInitScript` FOUC snippet in `layout.tsx`. It is a static string, not user input.
- Unused Markdown/MDX/syntax-highlighter packages were removed so they cannot become a future XSS vector by accident.
- Mock job feeds, addresses, and section copy render as React text → default escaping.

---

## 4. Dependency / supply chain

### Cleanup (this pass)

Removed unused template packages (and their CVE surface):

- `next-auth`, `prisma`, `@prisma/client`
- `@mdxeditor/editor`, `react-syntax-highlighter`, `react-markdown`
- `z-ai-web-dev-sdk`, `next-intl`, `zustand`, `zod` (unused), `@tanstack/react-table`, `@dnd-kit/*`
- `cmdk`, `vaul`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `react-day-picker`, `uuid`, `embla-carousel-react`, `input-otp`, `@reactuses/core`, `date-fns`
- Unused Radix/shadcn widgets (accordion, calendar, sidebar, etc.)

**Held:** `sharp` 0.34.x (Next 16 image pipeline; no untrusted uploads).  
**Held:** `wagmi` / `viem` / `@rainbow-me/rainbowkit` (required for wallet UI).

### How to re-audit

```bash
bun install
npm audit --omit=dev
```

---

## 5. Web3 / wallet surface

**Findings**
- RainbowKit + wagmi talk to Base public RPCs (`mainnet.base.org` / `sepolia.base.org`) unless overridden.
- WalletConnect `projectId` is a **public** client identifier. The demo fallback (`pulsar-demo-project-id`) is not a secret; a real id should come from WalletConnect Cloud before production TGE.
- Staking mutations (`approve` / `stake` / `unstake` / `claim` / `exit`) only fire when `IS_LIVE` is true **and** the user confirms in their wallet.
- Pre-TGE, staking UI is a preview; on-chain writes are disabled.

**Operational rule**
> Never commit a deployer private key or `.env` with `PRIVATE_KEY`. Contract deploy scripts live under `contracts/scripts/` and read env locally.

---

## 6. Secrets & config hygiene

**Findings**
- `.gitignore` excludes `.env`, `.env*.local`, `contracts/.env`, logs.
- `.env.example` documents public addresses and WalletConnect project id — no credentials.
- GitHub Actions Pages workflow may inject `NEXT_PUBLIC_*` from repo secrets; those values are public-by-design (they ship to the browser).

---

## 7. Next.js / HTTP surface

| Endpoint | Auth | Notes |
|----------|------|--------|
| `/` (static) | None | Marketing + mock dashboards |
| `/docs` | None | Static docs page |
| On-chain (Base) | Wallet signature | Only after TGE + `IS_LIVE` |

GitHub Pages uses `output: "export"`. Vercel (if used) must **not** use `output: "standalone"` (gated). TypeScript `ignoreBuildErrors` is **off**.

---

## 8. Residual risk & acceptance

**Accepted for portfolio demo**
- No user authentication on the public site.
- Mock telemetry (burns, job feed, holders) is illustrative, not on-chain.
- Wallet connect with a demo WalletConnect project id.
- `sharp` 0.34.x until Next 16 tracks 0.35.

**Not accepted at TGE**
- Shipping a real token address without a completed external audit.
- Committing deployer keys.
- Treating the Next.js UI as a source of truth for balances or APY.

---

## 9. Follow-ups (ordered)

1. **Done:** SECURITY.md + address validation.  
2. **Done:** Dependency audit triage + unused template dep drop.  
3. **Done:** Unit tests (`bun run test`).  
4. **Done:** `ignoreBuildErrors: false` + Vercel/standalone hygiene.  
5. **Done:** GitHub Dependabot + Playwright smokes + CI.

---

## 10. How to re-test

```bash
bun install
bun run test
bun run typecheck
bun run test:e2e
npm audit --omit=dev
```
