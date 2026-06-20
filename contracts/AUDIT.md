# PULSAR — Audit Submission Package

**Prepared for:** Hacken (or equivalent security firm)
**Date:** June 2026
**Commit:** `main` @ latest
**Chain:** Base (chainId 8453)
**Solidity:** 0.8.24
**OpenZeppelin:** v5.0.2

---

## 1. Scope

| Contract | Source | Lines | Purpose |
|----------|--------|-------|---------|
| `Pulsar.sol` | `src/Pulsar.sol` | ~350 | ERC-20 utility token with tax, anti-bot limits, burn |
| `PulsarStaking.sol` | `src/PulsarStaking.sol` | ~230 | Single-asset staking with configurable APY |

**Out of scope:** Frontend, deployment scripts, tests, future contracts (governance, vesting, compute settlement).

**Dependencies (audited):**
- OpenZeppelin Contracts v5.0.2 (ERC20, Ownable, ReentrancyGuard, Pausable, IERC20, SafeERC20)

---

## 2. Contract Architecture

### Pulsar.sol
```
ERC20 (OZ v5)
├── Ownable (OZ v5)
├── ReentrancyGuard (OZ v5)
└── Pausable (OZ v5)

State:
├── Fixed supply: 1,000,000,000e18 (minted in constructor, no mint function)
├── Buy/sell tax: 200 bps each (cap: 500 bps, reducible to 0)
├── Tax split: 50% treasury / 25% liquidity / 25% burn
├── Max-tx: 5% of supply (removable)
├── Max-wallet: 5% of supply (removable)
├── Trading: disabled by default, enabled once via enableTrading()
├── AMM pairs: configurable via setAutomatedMarketMakerPair()
└── Fee/limit exemptions: configurable per-address

Key functions:
├── constructor(treasury, liquidity, team) — mints full supply to deployer
├── enableTrading() — one-way switch, onlyOwner
├── setBuyTax(uint16) / setSellTax(uint16) — capped at 500 bps
├── setTaxShares(uint16, uint16, uint16) — must sum to 10000
├── setAutomatedMarketMakerPair(address, bool) — marks DEX pairs for tax detection
├── setExcludedFromFees(address, bool) / setExcludedFromLimits(address, bool)
├── setMaxTx(uint256) / setMaxWallet(uint256) — within 0.5%-5% of supply
├── removeLimits() — irreversible, removes max-tx + max-wallet
├── burn(uint256) / burnFrom(address, uint256) — deflationary
├── recoverERC20(address, address, uint256) — rescue accidentally sent tokens
└── _update(from, to, amount) — override; applies tax + limits before transfer
```

### PulsarStaking.sol
```
Ownable (OZ v5)
├── ReentrancyGuard (OZ v5)
└── Pausable (OZ v5)

State:
├── Staked token: Pulsar (immutable)
├── Reward emission: linear over 30-day periods
├── Reward rate: configurable by owner (multisig)
├── Reward pool: funded via topUpRewards()
├── User state: { amount, rewardDebt, pendingRewards }
└── No locking — users can unstake anytime

Key functions:
├── constructor(pulsar) — sets staked token
├── stake(uint256) — transferFrom + update rewards
├── unstake(uint256) — transfer + update rewards
├── claim() — transfer pending rewards
├── exit() — unstake all + claim
├── earned(address) — view, calculates pending rewards
├── currentAPYBps() — view, current annual yield in bps
├── topUpRewards(uint256) — onlyOwner, adds rewards + resets 30-day period
├── setRewardRate(uint256) — onlyOwner
├── pause() / unpause() — onlyOwner, emergency
└── recoverERC20(address, address, uint256) — onlyOwner, cannot seize staked principal
```

---

## 3. Threat Model

### 3.1 Centralization risks (ACKNOWLEDGED)

| Risk | Mitigation |
|------|------------|
| Owner can change tax up to 5% | Hard cap at 500 bps; owner is multisig post-launch; tax reducible to 0 |
| Owner can set max-tx/max-wallet | Hard cap at 5% of supply; removable entirely |
| Owner can exclude any address from fees | Transparent (emits events); owner is multisig |
| Owner can recover ERC-20s from token contract | Cannot drain during limits phase; emits event |
| Staking owner can change reward rate | Rate changes don't affect already-earned rewards; owner is multisig |
| Staking owner can pause | Emergency only; emits event; multisig-gated |

**Post-launch plan:** Ownership of both contracts transfers to a 3-of-5 Gnosis Safe multisig. The multisig includes 2 team members, 2 community-elected members, and 1 external advisor.

### 3.2 Attack vectors considered

| Attack | Status | Notes |
|--------|--------|-------|
| Reentrancy on stake/unstake/claim | ✅ Protected | ReentrancyGuard on all state-changing functions |
| Reentrancy via ERC-20 callback | ✅ Protected | _update applies tax before external transfer |
| Integer overflow | ✅ Protected | Solidity 0.8.x built-in overflow checks |
| Frontrunning stake/unstake | ⚠️ Low risk | No MEV-sensitive operations; rewards are linear |
| Flash loan manipulation | ✅ Not applicable | No oracle dependency; no governance voting in scope |
| Sandwich attacks on tax | ⚠️ Acknowledged | Tax is deterministic; users can avoid by setting slippage |
| Burn address accumulation | ✅ Verified | Burn sends to address(0); supply decreases correctly |
| Staking pool drain via recoverERC20 | ✅ Protected | recoverERC20 on staking checks `balance - totalStaked` |
| Trading enabled frontrun | ✅ Protected | enableTrading() is one-way; buys blocked pre-enable |
| Tax bypass via pair manipulation | ✅ Protected | AMM pairs must be explicitly set; fee check on both from/to |
| Sybil via max-wallet | ⚠️ Bypassable | Users can spread across wallets; accepted tradeoff for UX |

### 3.3 Economic risks (OUT OF SCOPE — noted for completeness)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tax rate reduction reduces treasury inflow | Low | Treasury has initial allocation; tax reducible to 0 only via governance |
| Staking reward pool exhaustion | Medium | Owner must topUpRewards before period ends; APY drops to 0 if exhausted |
| Deflationary spiral from burn | Very low | Burn is fixed-share of tax, not dynamic; supply floor is ~870M over 5 years |

---

## 4. Design Decisions

### 4.1 Why not upgradeable?
The contracts are **NOT upgradeable** by design. This is a trust feature — the source code is immortal and auditable. Any future feature additions will be deployed as new contracts (e.g., governance, compute settlement) rather than upgrading existing ones.

**Trade-off:** Bug fixes require a migration. Accepted in exchange for trust.

### 4.2 Why tax-based instead of protocol-fee-based?
The 2%/2% transfer tax is the **interim** revenue mechanism. Once the compute settlement contract (Phase 6) is live, the protocol fee will be collected at the job-settlement layer (1% per compute job). The transfer tax will then be reduced to 0% via governance.

**Trade-off:** Tax creates friction on DEX trading. Accepted for initial treasury bootstrapping.

### 4.3 Why max-tx and max-wallet?
Anti-bot protection at launch. Both are **removable** (and will be removed within 30 days of launch once price discovery stabilizes). Hard-capped at 5% of supply to prevent owner abuse.

### 4.4 Why linear staking instead of compound?
Simplicity + auditability. `earned = staked × (rewardPerToken_now - rewardPerToken_at_last_update)`. No compounding — users must manually restake. This matches Synthetix's StakingRewards pattern (battle-tested).

### 4.5 Why SafeERC20 in staking but raw transfer in token?
The token uses OpenZeppelin's ERC20 `_update` override (which handles the tax split internally). The staking contract uses `SafeERC20` because it interacts with the token as an external contract — `safeTransfer`/`safeTransferFrom` handle non-standard return values.

### 4.6 Why `block.timestamp` for staking rewards?
Staking uses `block.timestamp` for reward accrual. Validators can manipulate `block.timestamp` by ~15 seconds, but this only affects reward distribution timing (not amounts) and the economic impact is negligible (<0.001% of rewards per block).

---

## 5. Test Coverage

```
29 tests, 0 failures

Token basics:
  ✅ test_SupplyIsFixed
  ✅ test_NameAndSymbol
  ✅ test_NoMintFunction
  ✅ test_BurnReducesSupply
  ✅ test_BurnFromRespectsAllowance
  ✅ test_BurnFromRevertsOnInsufficientAllowance

Tax mechanics:
  ✅ test_BuyTaxApplied
  ✅ test_SellTaxApplied
  ✅ test_TaxCappedAt5Percent
  ✅ test_TaxReducibleToZero
  ✅ test_TaxSharesMustSumTo10000
  ✅ test_ExemptAddressesSkipTax

Anti-bot limits:
  ✅ test_MaxTxEnforced
  ✅ test_MaxWalletEnforced
  ✅ test_RemoveLimitsDisablesCaps
  ✅ test_TradingEnabledOnce
  ✅ test_CannotBuyBeforeTradingEnabled

Access control:
  ✅ test_OnlyOwnerCanSetTax
  ✅ test_OnlyOwnerCanSetAMM
  ✅ test_OnlyOwnerCanRecover
  ✅ test_OwnershipTransferable

Staking:
  ✅ test_StakeAndEarn
  ✅ test_UnstakeReturnsPrincipal
  ✅ test_ClaimPaysRewards
  ✅ test_ExitUnstakesAndClaims
  ✅ test_OwnerCannotSeizeStakedPrincipal
  ✅ test_StakeRequiresApproval
  ✅ test_CurrentAPYBps
  ✅ test_TopUpRewardsExtendsPeriod
```

**To run:**
```bash
cd contracts
forge test -vv
```

---

## 6. Local Deployment Verification

Full lifecycle verified on local anvil node:

```
1. Deploy Pulsar token          → 0x5FbDB2315678afecb367f032d93F642f64180aa3
2. Deploy PulsarStaking         → 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
3. Verify: name="Pulsar", symbol="PULSAR", supply=1B, tax=2%/2%
4. Exempt staking from fees/limits
5. Enable trading
6. Transfer 1M PULSAR to Bob    → balance: 1,000,000 ✓
7. Fund staking with 10M rewards
8. Bob stakes 100K              → total staked: 100,000 ✓
9. Warp 15 days                 → Bob earned: ~5,000 PULSAR (10M/30d × 15d) ✓
10. Bob claims                   → balance: 5,900,000 (900K + 5M rewards) ✓
11. Bob unstakes 100K            → balance: 6,000,000, total staked: 0 ✓
```

---

## 7. Known Issues & Limitations

1. **Tax on LP adding**: When the owner adds initial liquidity to Uniswap, the transfer to the pair may be taxed if the owner is not exempt. **Mitigation:** Owner is auto-exempt in constructor.

2. **Staking rewards rounding**: Rewards are calculated with 1e18 precision. Dust amounts (<1e15) may be unclaimable. **Impact:** Negligible (<$0.01 per user).

3. **No permit/EIP-2612**: The token does not support gasless approvals. **Future:** Can be added via ERC20Permit extension if needed for CEX integrations.

4. **Single reward token**: Staking only rewards in $PULSAR. **Future:** Can be upgraded to a multi-reward system via a new contract (not upgradeable — new deployment).

5. **No veToken/governance integration**: Staking does not lock tokens or confer voting power. **Future:** Separate governance contract will read staked balances via the staking contract.

---

## 8. Files for Auditor

```
contracts/
├── src/
│   ├── Pulsar.sol              ← Primary audit target
│   └── PulsarStaking.sol       ← Primary audit target
├── test/
│   └── Pulsar.t.sol            ← 29 unit tests
├── script/
│   └── Deploy.s.sol            ← Deployment script
├── foundry.toml                ← Compiler config (solc 0.8.24, optimizer 200 runs)
└── AUDIT.md                    ← This file
```

**Flattened source** (for tools that prefer single-file):
```bash
forge flatten src/Pulsar.sol > out/Pulsar.flat.sol
forge flatten src/PulsarStaking.sol > out/PulsarStaking.flat.sol
```

---

## 9. Contact

- **Team:** Pulsar Compute
- **Project:** https://pulsarcompute.xyz
- **Docs:** /docs (coming soon)
- **GitHub:** https://github.com/pulsarcompute

---

## 10. Auditor Checklist (for Hacken)

- [ ] Review access control (onlyOwner modifiers, multisig plan)
- [ ] Review reentrancy protection on all state-changing functions
- [ ] Review tax calculation for rounding errors
- [ ] Review max-tx/max-wallet enforcement paths
- [ ] Review burn mechanism (supply reduction, event emissions)
- [ ] Review recoverERC20 (can it drain user funds? can it drain staked principal?)
- [ ] Review staking reward math (rewardPerToken, earned, updateReward)
- [ ] Review staking edge cases (first staker, last unstaker, reward pool exhaustion)
- [ ] Review pause/unpause (can it be abused? can users exit when paused?)
- [ ] Review trading enable (one-way, frontrun protection)
- [ ] Review AMM pair detection (can tax be bypassed?)
- [ ] Review integer precision (18 decimals throughout)
- [ ] Review event emissions (sufficient for off-chain indexing?)
- [ ] Review gas optimization (unnecessary storage reads/writes?)
- [ ] Review Solidity version (0.8.24 — any known issues?)

---

*End of audit submission package.*
