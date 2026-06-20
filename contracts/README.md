# PULSAR Smart Contracts

ERC-20 utility token + staking for the Pulsar decentralized AI compute network.
Chain: **Base** (chainId 8453). Standard: ERC-20. Not upgradeable.

## Quick Start

```bash
# 1. Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. Install dependencies
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2

# 3. Build
forge build

# 4. Run tests (29 tests)
forge test -vv

# 5. Deploy to Base Sepolia testnet
cp .env.example .env
# Edit .env with your funded deployer key + wallet addresses
bash scripts/deploy-testnet.sh
```

---

## Testnet Deployment Guide (Base Sepolia)

### Step 1: Get testnet ETH

1. Go to one of these faucets:
   - https://faucet.base.org (Coinbase — requires social verification)
   - https://www.alchemy.com/faucets/base-sepolia (Alchemy)
   - https://thirdweb.com/base-sepolia-testnet (thirdweb)
2. Paste your wallet address
3. Claim ~0.5 ETH (free, enough for ~50 deploys)

### Step 2: Set up your environment

```bash
cd contracts
cp .env.example .env
```

Edit `.env`:
```bash
# Your funded testnet wallet (the one you got ETH for)
DEPLOYER_PRIVATE_KEY=0x...

# Allocation wallets (can all be the same address for testnet)
TREASURY=0x...       # where treasury tax goes
LIQUIDITY=0x...      # where liquidity tax goes
TEAM=0x...           # team allocation wallet

# Basescan API key (optional, for verification)
# Get from https://sepolia.basescan.org/apis
ETHERSCAN_API_KEY=...

# RPC (default works, or use Alchemy/QuickNode for reliability)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

### Step 3: Deploy

```bash
source .env
bash scripts/deploy-testnet.sh
```

The script will:
1. Compile contracts
2. Deploy Pulsar token
3. Deploy PulsarStaking
4. Verify on Basescan (if API key set)
5. Exempt staking from fees
6. Enable trading
7. Print deployed addresses + Basescan links

### Step 4: Fund staking rewards

```bash
source .env
RPC=https://sepolia.base.org

# Approve staking contract to spend 10M PULSAR
cast send $PULSAR_TOKEN "approve(address,uint256)" $PULSAR_STAKING 10000000000000000000000000 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY

# Top up rewards (starts 30-day emission)
cast send $PULSAR_STAKING "topUpRewards(uint256)" 10000000000000000000000000 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY
```

### Step 5: Test the full lifecycle

Transfer tokens to a test wallet, then stake:

```bash
# Transfer 100K PULSAR to a test wallet
TEST_WALLET=0x...  # your MetaMask test address
cast send $PULSAR_TOKEN "transfer(address,uint256)" $TEST_WALLET 100000000000000000000000 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY

# From the test wallet: approve + stake
TEST_KEY=0x...  # test wallet's private key

cast send $PULSAR_TOKEN "approve(address,uint256)" $PULSAR_STAKING 100000000000000000000000 \
  --rpc-url $RPC --private-key $TEST_KEY

cast send $PULSAR_STAKING "stake(uint256)" 100000000000000000000000 \
  --rpc-url $RPC --private-key $TEST_KEY

# Check earnings
cast call $PULSAR_STAKING "earned(address)(uint256)" $TEST_WALLET --rpc-url $RPC

# Claim rewards
cast send $PULSAR_STAKING "claim()" --rpc-url $RPC --private-key $TEST_KEY

# Unstake
cast send $PULSAR_STAKING "unstake(uint256)" 100000000000000000000000 \
  --rpc-url $RPC --private-key $TEST_KEY
```

### Step 6: Use the website with real contracts

Set these in your `.env.local` (or GitHub Actions secrets):
```bash
NEXT_PUBLIC_PULSAR_TOKEN=0x...        # from deploy output
NEXT_PUBLIC_PULSAR_STAKING=0x...      # from deploy output
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...  # from cloud.walletconnect.com
NEXT_PUBLIC_BASE_RPC_URL=https://sepolia.base.org  # testnet
```

The website will:
- Show the real contract address + "Verified ✓" badge in the hero
- Read real balances in the staking dashboard
- Execute real stake/unstake/claim transactions via MetaMask

---

## Mainnet Deployment (DO NOT run without audit)

**Prerequisites:**
- ✅ Hacken audit complete, all Critical/High issues fixed
- ✅ Legal opinion obtained
- ✅ Gnosis Safe multisig deployed (3-of-5)
- ✅ Deployer wallet funded with ~0.5 ETH on Base mainnet

```bash
# Same as testnet but with mainnet RPC
export BASE_RPC_URL=https://mainnet.base.org
source .env
bash scripts/deploy-testnet.sh  # rename to deploy-mainnet.sh for clarity

# Post-deploy:
# 1. Transfer ownership to multisig
cast send $PULSAR_TOKEN "transferOwnership(address)" $MULTISIG \
  --rpc-url $BASE_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY
cast send $PULSAR_STAKING "transferOwnership(address)" $MULTISIG \
  --rpc-url $BASE_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY

# 2. Add Uniswap liquidity (manual via app.uniswap.org)

# 3. Set AMM pair
cast send $PULSAR_TOKEN "setAutomatedMarketMakerPair(address,bool)" $PAIR true \
  --rpc-url $BASE_RPC_URL --private-key $MULTISIG_KEY

# 4. Lock liquidity via UNCX (manual via uncx.network)
```

---

## Contract Overview

### Pulsar.sol — ERC-20 Token

| Feature | Value |
|---------|-------|
| Name | Pulsar |
| Symbol | PULSAR |
| Decimals | 18 |
| Total supply | 1,000,000,000 (fixed, no mint) |
| Buy tax | 2% (cap 5%, reducible to 0%) |
| Sell tax | 2% (cap 5%, reducible to 0%) |
| Tax split | 50% treasury / 25% liquidity / 25% burn |
| Max-tx | 5% of supply (removable) |
| Max-wallet | 5% of supply (removable) |
| Trading | Disabled by default, enabled once |
| Upgradeable | No |
| Burn | Yes (burn + burnFrom) |

### PulsarStaking.sol — Staking

| Feature | Value |
|---------|-------|
| Staked token | PULSAR |
| Reward token | PULSAR |
| Reward period | 30 days per top-up |
| Reward rate | Configurable by owner |
| Locking | No (unstake anytime) |
| APY | Displayed via currentAPYBps() |
| Owner can seize principal | No |
| Upgradeable | No |

---

## Files

```
contracts/
├── src/
│   ├── Pulsar.sol              # ERC-20 token
│   └── PulsarStaking.sol       # Staking vault
├── script/
│   └── Deploy.s.sol            # Foundry deployment script
├── scripts/
│   └── deploy-testnet.sh       # One-command testnet deploy
├── test/
│   └── Pulsar.t.sol            # 29 unit tests
├── abi/
│   ├── Pulsar.json             # ABI for frontend
│   └── PulsarStaking.json
├── foundry.toml
├── AUDIT.md                    # Audit submission package
├── README.md                   # This file
└── .env.example
```

## Audit

See [`AUDIT.md`](./AUDIT.md) for the full audit submission package including:
- Scope and architecture
- Threat model
- Design decisions
- Test coverage (29 tests)
- Known issues
- Auditor checklist

## License

MIT.
