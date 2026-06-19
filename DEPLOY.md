# Deploy Guide

Two ways to host PULSAR live. Pick one.

| | **Vercel** | **GitHub Pages** |
|---|---|---|
| Cost | Free tier | Free |
| Build | Automatic on push | Automatic via GitHub Actions |
| URL | `pulsar-username.vercel.app` | `username.github.io/pulsar/` |
| Custom domain | One-click | CNAME + 10-min DNS |
| Setup time | ~5 min | ~5 min (one-time) |
| Lives in your repo | No (external) | **Yes** (great for portfolio) |
| Next.js Image opt | Yes | No (uses `unoptimized: true`) |
| Smart contract deploy | Same on both | Same on both |

**Recommendation:** Use **GitHub Pages** if this is a portfolio piece — it lives in your repo, costs nothing, and recruiters see the workflow. Use **Vercel** if you plan to add server-side features later (API routes, ISR, etc.).

---

## Option A — GitHub Pages (recommended for portfolio)

### One-time setup (~3 min)

1. **Push your code to GitHub** (if you haven't already):
   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/pulsar.git
   git push -u origin main
   ```

2. **Enable GitHub Actions deployment**:
   - Repo → **Settings → Pages**
   - Under "Build and deployment" → **Source:** `GitHub Actions`
   - (You don't need to pick a branch — the workflow handles it.)

3. **Grant workflow write access**:
   - Repo → **Settings → Actions → General**
   - Scroll to **Workflow permissions** → choose **Read and write permissions**
   - Save.

4. **Add the WalletConnect projectId as a secret**:
   - Get a free projectId at https://cloud.walletconnect.com (2 min).
   - Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` · Value: your projectId

That's it. The workflow at `.github/workflows/deploy.yml` will:
- Detect the repo name (e.g. `pulsar`) → set `basePath=/pulsar`
- Build with `output: 'export'` → produces `out/` directory
- Push `out/` to GitHub Pages
- Site goes live at **`https://YOUR_USERNAME.github.io/pulsar/`**

Every `git push` to `main` triggers a rebuild (~2-3 min).

### Optional: add contract addresses when you deploy them

When the smart contracts are live on Base, add 3 more secrets the same way:
- `NEXT_PUBLIC_PULSAR_TOKEN` — deployed token address
- `NEXT_PUBLIC_PULSAR_STAKING` — deployed staking address
- `NEXT_PUBLIC_UNISWAP_V2_PAIR` — Uniswap V2 pair on Base

The site flips from "Pre-launch" to "Live" automatically on the next deploy.

### How it works under the hood

- `next.config.ts` checks `process.env.GITHUB_PAGES === "1"`. When true (set by the workflow), it switches to `output: 'export'` and applies `basePath` + `assetPrefix`.
- `src/lib/asset.ts` prefixes `<img>` and metadata icon paths with `NEXT_PUBLIC_BASE_PATH` so they work under the subpath.
- `public/.nojekyll` (committed) tells GitHub Pages not to process the `_next/` folder with Jekyll — without it, files starting with `_` get dropped.
- The workflow uses the official `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages` v4 actions.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Workflow fails with "Pages not enabled" | Repo → Settings → Pages → Source = "GitHub Actions" |
| Workflow fails with "Permission denied" writing to Pages | Repo → Settings → Actions → General → Workflow permissions = "Read and write" |
| Site loads but assets 404 | Check `basePath` matches repo name. The workflow auto-computes it from `GITHUB_REPOSITORY`. |
| 3D hero shows but wallet modal empty | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` secret not set or wrong value. |
| Want to deploy to root domain (`username.github.io`) | Create a repo named exactly `username.github.io` and push this code there. The workflow auto-detects and uses no basePath. |
| Custom domain (e.g. `pulsarcompute.xyz`) | Repo → Settings → Pages → Custom domain → enter domain. Add CNAME at your registrar pointing to `username.github.io`. **You must also remove `basePath`** in `next.config.ts` when using a custom domain — set `BASE_PATH=""` in the workflow env or fork the workflow. |

---

## Option B — Vercel

### Steps (~5 min)

1. **Push to GitHub** (same as above).

2. Go to https://vercel.com/new → **Import** your `pulsar` repo.

3. Vercel auto-detects Next.js. Leave defaults:
   - **Framework preset:** Next.js
   - **Build command:** `next build` (override the `package.json` `build` script which is for standalone)
   - **Install command:** `bun install` (or `npm install`)

4. **Environment Variables** (only 1 required for preview mode):
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — **required** for wallet modal
   - `NEXT_PUBLIC_PULSAR_TOKEN` — optional, for live mode
   - `NEXT_PUBLIC_PULSAR_STAKING` — optional
   - `NEXT_PUBLIC_UNISWAP_V2_PAIR` — optional

5. Click **Deploy**. Live at `https://pulsar-YOUR_USERNAME.vercel.app` in ~2 min.

### Vercel notes

- The `vercel.json` in this repo sets `buildCommand: "next build"` and security headers automatically.
- Vercel uses `output: 'standalone'` from `next.config.ts` (the `GITHUB_PAGES` env var is unset on Vercel, so the export path isn't triggered).
- Custom domain: Settings → Domains → enter domain → follow DNS instructions → HTTPS is auto-provisioned.

---

## Smart contract deployment (Base mainnet)

Independent of which host you choose:

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
forge test -vv

# Set up contracts/.env (copy from contracts/.env.example)
source .env

forge script script/Deploy.s.sol:PulsarScript \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --sender $(cast wallet address $PRIVATE_KEY)
```

Post-deploy checklist:
1. Add Uniswap V2 liquidity on Base (Liquidity allocation)
2. `setAutomatedMarketMakerPair(pair, true)` on the token
3. `enableTrading()`
4. Lock liquidity via UNCX (12-month minimum)
5. Transfer allocations to vesting contracts + multisig
6. (Optional) Deploy staking + `topUpRewards(amount)`
7. Transfer ownership to multisig (or renounce)

Then set the 3 contract address env vars (in Vercel or as GitHub Actions secrets) and redeploy. The site flips from preview to live automatically.

---

## Summary

```
                GitHub repo (public)
                       │
        ┌──────────────┴──────────────┐
        │                             │
   Vercel auto-deploys           GitHub Actions workflow
        │                             │
        ▼                             ▼
  pulsar-xxx.vercel.app       username.github.io/pulsar/
        │                             │
        └──────────┬──────────────────┘
                   │
                   ▼
        WalletConnect Cloud (projectId)
                   │
                   ▼
        Base mainnet → $PULSAR + staking contracts
        (set addresses as env vars to flip site to "live")
```

No database. No backend. Just a static Next.js app + on-chain smart contracts.
