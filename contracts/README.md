# PULSAR Smart Contracts

ERC-20 utility token + staking for the Pulsar decentralized AI compute network.
Chain: **Base** (chainId 8453). Standard: ERC-20. Not upgradeable.

## Files

```
contracts/
├── src/
│   ├── Pulsar.sol          # $PULSAR ERC-20 (fixed supply, tax, limits, burn)
│   └── PulsarStaking.sol   # Single-asset $PULSAR staking (configurable APY)
├── script/
│   └── Deploy.s.sol        # Foundry deployment script
├── test/
│   └── Pulsar.t.sol        # Unit tests (Foundry)
├── abi/
│   ├── Pulsar.json         # ABI (post-compile)
│   └── PulsarStaking.json
├── foundry.toml
└── README.md
```

## Tokenomics (mirrors /docs/TOKENOMICS.md)

| Allocation | % | Supply | Vesting |
|---|---|---|---|
| Ecosystem & compute rewards | 35% | 350,000,000 | Released over time as network grows |
| Liquidity (DEX pair) | 20% | 200,000,000 | Locked 12 months via UNCX |
| Team & advisors | 15% | 150,000,000 | 6-mo cliff, 24-mo linear vest |
| Marketing & partnerships | 12% | 120,000,000 | Released against milestones |
| Treasury / DAO reserve | 10% | 100,000,000 | Multisig-governed |
| Presale / early supporters | 8% | 80,000,000 | 10% at TGE, 6-mo vest |

- **Total supply:** 1,000,000,000 $PULSAR (1B), fixed, no mint.
- **Tax:** 2% buy / 2% sell (cap 5/5, reducible to 0/0).
  - Split: 50% treasury / 25% liquidity / 25% burn (= 1% / 0.5% / 0.5% of taxed amount).
- **Deflation:** protocol fees from compute jobs fund quarterly buyback-and-burn.

## Setup (Foundry)

```bash
# 1. Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 2. Install OpenZeppelin
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# 3. Build
forge build

# 4. Test
forge test -vv

# 5. Deploy (Base mainnet)
# .env should contain:
#   BASE_RPC_URL=https://mainnet.base.org
#   PRIVATE_KEY=0x...
#   ETHERSCAN_API_KEY=...
#   TREASURY=0x... LIQUIDITY=0x... TEAM=0x...
source .env
forge script script/Deploy.s.sol:PulsarScript \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --sender $(cast wallet address $PRIVATE_KEY)
```

## Post-deploy

1. **Add liquidity** on Uniswap V2 (Base) using the `Liquidity` allocation.
2. **Set the pair** on the token:
   ```bash
   cast send $PULSAR "setAutomatedMarketMakerPair(address,bool)" $PAIR true \
     --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
   ```
3. **Enable trading**:
   ```bash
   cast send $PULSAR "enableTrading()" --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
   ```
4. **Lock liquidity** via UNCX (12-month minimum).
5. **Transfer allocations** to vesting contracts + multisig (Gnosis Safe on Base).
6. **(Optional) Deploy staking** + `topUpRewards(amount)` to fund the reward pool.
7. **(Optional) Renounce ownership** or transfer to multisig:
   ```bash
   cast send $PULSAR "transferOwnership(address)" $MULTISIG --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
   ```

## Verification

- Contract source is verified on Basescan via `--verify` in the deploy script.
- Address + verified badge are surfaced on the website (`pulsarcompute.xyz`) Hero + Trust sections.

## Audits

- Phase 1: Hacken
- Phase 3: CertiK (for tier-2 CEX listings)
- KYC: Hacken or Assure Defy

## License

MIT.
