#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# PULSAR — Base MAINNET Deployment Script
# =============================================================================
#
# ⚠️  DO NOT RUN THIS WITHOUT:
#   - ✅ Legal opinion obtained
#   - ✅ Hacken audit complete + all Critical/High findings fixed
#   - ✅ Gnosis Safe multisig deployed on Base mainnet
#   - ✅ KYC complete
#   - ✅ Deployer wallet funded with 0.5+ ETH on Base mainnet
#
# This script:
#   1. Deploys Pulsar token to Base mainnet
#   2. Deploys PulsarStaking
#   3. Verifies both on Basescan
#   4. Exempts staking from fees
#   5. Enables trading
#   6. Prints deployed addresses + next steps
#
# USAGE:
#   cd contracts
#   cp .env.example .env
#   # Edit .env with MAINNET values (see below)
#   bash scripts/deploy-mainnet.sh
# =============================================================================

set -a
source .env 2>/dev/null || true
set +a

# Validate required env vars
for var in DEPLOYER_PRIVATE_KEY TREASURY LIQUIDITY TEAM; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is not set. Create a .env file or export it."
    echo "See contracts/.env.example for the template."
    exit 1
  fi
done

RPC_URL="${BASE_RPC_URL:-https://mainnet.base.org}"
ETHERSCAN_KEY="${ETHERSCAN_API_KEY:-}"
DEPLOYER_ADDR=$(cast wallet address "$DEPLOYER_PRIVATE_KEY")

echo "=========================================="
echo "  ⚠️  PULSAR — BASE MAINNET DEPLOYMENT  ⚠️"
echo "=========================================="
echo ""
echo "  This is a REAL mainnet deployment."
echo "  Real ETH will be spent. Real contracts will be created."
echo "  This CANNOT be undone."
echo ""
echo "=========================================="
echo ""
echo "RPC:            $RPC_URL"
echo "Deployer:       $DEPLOYER_ADDR"
echo "Treasury:       $TREASURY (should be your multisig)"
echo "Liquidity:      $LIQUIDITY (should be your multisig)"
echo "Team:           $TEAM (should be your multisig or vesting contract)"
echo "Etherscan key:  ${ETHERSCAN_KEY:-(not set — skipping verification)}"
echo ""

# Check deployer balance
BALANCE=$(cast balance "$DEPLOYER_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
echo "Deployer balance: $(cast --from-wei "$BALANCE" 2>/dev/null || echo "$BALANCE") ETH"
if [ "$BALANCE" = "0" ] || [ -z "$BALANCE" ]; then
  echo ""
  echo "ERROR: Deployer has 0 balance. Fund it with 0.5+ ETH on Base mainnet."
  exit 1
fi
echo ""

# Final confirmation
echo "=========================================="
echo "  FINAL CONFIRMATION"
echo "=========================================="
echo ""
echo "  Checklist (all must be ✅):"
echo "  [ ] Legal opinion obtained"
echo "  [ ] Hacken audit complete + findings fixed"
echo "  [ ] Gnosis Safe multisig deployed"
echo "  [ ] KYC complete"
echo "  [ ] Deployer funded with 0.5+ ETH"
echo "  [ ] Treasury/Liquidity/Team addresses are your multisig"
echo ""
read -p "  Type 'DEPLOY' to continue (anything else aborts): " CONFIRM
if [ "$CONFIRM" != "DEPLOY" ]; then
  echo "Aborted."
  exit 1
fi
echo ""

# Compile
echo "=== Compiling contracts ==="
forge build
echo ""

# Deploy token
echo "=== Deploying Pulsar token ==="
TOKEN=$(forge create src/Pulsar.sol:Pulsar \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  --constructor-args "$TREASURY" "$LIQUIDITY" "$TEAM" \
  2>&1 | grep "Deployed to:" | awk '{print $3}')
echo "Token: $TOKEN"

# Deploy staking
echo ""
echo "=== Deploying PulsarStaking ==="
STAKING=$(forge create src/PulsarStaking.sol:PulsarStaking \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  --constructor-args "$TOKEN" \
  2>&1 | grep "Deployed to:" | awk '{print $3}')
echo "Staking: $STAKING"

# Verify on Basescan (if API key provided)
if [ -n "$ETHERSCAN_KEY" ]; then
  echo ""
  echo "=== Verifying on Basescan ==="
  forge verify-contract "$TOKEN" src/Pulsar.sol:Pulsar \
    --chain-id 8453 \
    --etherscan-api-key "$ETHERSCAN_KEY" \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" "$TREASURY" "$LIQUIDITY" "$TEAM") \
    --watch 2>&1 || echo "Token verification failed (can verify manually on Basescan)"
  
  forge verify-contract "$STAKING" src/PulsarStaking.sol:PulsarStaking \
    --chain-id 8453 \
    --etherscan-api-key "$ETHERSCAN_KEY" \
    --constructor-args $(cast abi-encode "constructor(address)" "$TOKEN") \
    --watch 2>&1 || echo "Staking verification failed (can verify manually on Basescan)"
fi

# Configure: exempt staking, enable trading
echo ""
echo "=== Configuring contracts ==="
cast send "$TOKEN" "setExcludedFromFees(address,bool)" "$STAKING" true \
  --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PRIVATE_KEY" 2>&1 | grep "status"
cast send "$TOKEN" "setExcludedFromLimits(address,bool)" "$STAKING" true \
  --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PRIVATE_KEY" 2>&1 | grep "status"
cast send "$TOKEN" "enableTrading()" \
  --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PRIVATE_KEY" 2>&1 | grep "status"

# Verify deployment
echo ""
echo "=== Verification ==="
echo "Name:         $(cast call "$TOKEN" "name()(string)" --rpc-url "$RPC_URL")"
echo "Symbol:       $(cast call "$TOKEN" "symbol()(string)" --rpc-url "$RPC_URL")"
echo "Total supply: $(cast call "$TOKEN" "totalSupply()(uint256)" --rpc-url "$RPC_URL")"
echo "Owner:        $(cast call "$TOKEN" "owner()(address)" --rpc-url "$RPC_URL")"
echo "Buy tax:      $(cast call "$TOKEN" "buyTaxBps()(uint16)" --rpc-url "$RPC_URL") bps"
echo "Sell tax:     $(cast call "$TOKEN" "sellTaxBps()(uint16)" --rpc-url "$RPC_URL") bps"
echo "Trading:      $(cast call "$TOKEN" "tradingEnabled()(bool)" --rpc-url "$RPC_URL")"

echo ""
echo "=========================================="
echo "  🎉 MAINNET DEPLOYMENT COMPLETE 🎉"
echo "=========================================="
echo ""
echo "PULSAR_TOKEN=$TOKEN"
echo "PULSAR_STAKING=$STAKING"
echo ""
echo "Basescan links:"
echo "  Token:   https://basescan.org/address/$TOKEN"
echo "  Staking: https://basescan.org/address/$STAKING"
echo ""
echo "=========================================="
echo "  NEXT STEPS (in order)"
echo "=========================================="
echo ""
echo "1. Add Uniswap liquidity (see guides/uniswap-liquidity.md):"
echo "   https://app.uniswap.org on Base"
echo "   - 50 ETH + 200M \$PULSAR"
echo "   - Record the pair address"
echo ""
echo "2. Set the AMM pair on the token:"
echo "   cast send $TOKEN 'setAutomatedMarketMakerPair(address,bool)' PAIR_ADDRESS true \\"
echo "     --rpc-url $RPC_URL --private-key \$DEPLOYER_PRIVATE_KEY"
echo ""
echo "3. Lock liquidity via UNCX (see guides/uncx-lock.md):"
echo "   https://uncx.network on Base"
echo ""
echo "4. Transfer ownership to multisig:"
echo "   cast send $TOKEN 'transferOwnership(address)' \$MULTISIG \\"
echo "     --rpc-url $RPC_URL --private-key \$DEPLOYER_PRIVATE_KEY"
echo "   cast send $STAKING 'transferOwnership(address)' \$MULTISIG \\"
echo "     --rpc-url $RPC_URL --private-key \$DEPLOYER_PRIVATE_KEY"
echo ""
echo "5. Set env vars in GitHub repo secrets:"
echo "   NEXT_PUBLIC_PULSAR_TOKEN=$TOKEN"
echo "   NEXT_PUBLIC_PULSAR_STAKING=$STAKING"
echo "   NEXT_PUBLIC_UNISWAP_V2_PAIR=PAIR_ADDRESS"
echo "   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=..."
echo ""
echo "6. Push to GitHub → site goes live"
echo ""
echo "=========================================="
