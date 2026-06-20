#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# PULSAR — Base Sepolia Testnet Deployment Script
# =============================================================================
#
# This script deploys Pulsar + PulsarStaking to Base Sepolia, verifies on
# Basescan, and runs through the full lifecycle (enable trading, fund staking,
# test stake/claim/unstake).
#
# PREREQUISITES:
#   1. Foundry installed:  curl -L https://foundry.paradigm.xyz | bash && foundryup
#   2. OpenZeppelin installed:  cd contracts && forge install OpenZeppelin/openzeppelin-contracts@v5.0.2
#   3. Deployer wallet funded with Base Sepolia ETH (get from faucet.base.org)
#   4. Environment variables set (see below)
#
# USAGE:
#   export DEPLOYER_PRIVATE_KEY=0x...        # your funded testnet wallet
#   export TREASURY=0x...                    # treasury wallet (can be same as deployer for test)
#   export LIQUIDITY=0x...                   # liquidity wallet
#   export TEAM=0x...                        # team wallet
#   export ETHERSCAN_API_KEY=...             # from basescan.org/apis (optional, for verification)
#   bash scripts/deploy-testnet.sh
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

RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
ETHERSCAN_KEY="${ETHERSCAN_API_KEY:-}"
DEPLOYER_ADDR=$(cast wallet address "$DEPLOYER_PRIVATE_KEY")

echo "=========================================="
echo "  PULSAR — Base Sepolia Deployment"
echo "=========================================="
echo "RPC:            $RPC_URL"
echo "Deployer:       $DEPLOYER_ADDR"
echo "Treasury:       $TREASURY"
echo "Liquidity:      $LIQUIDITY"
echo "Team:           $TEAM"
echo "Etherscan key:  ${ETHERSCAN_KEY:-(not set — skipping verification)}"
echo ""

# Check deployer balance
BALANCE=$(cast balance "$DEPLOYER_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
echo "Deployer balance: $(cast --from-wei "$BALANCE" 2>/dev/null || echo "$BALANCE") ETH"
if [ "$BALANCE" = "0" ] || [ -z "$BALANCE" ]; then
  echo ""
  echo "ERROR: Deployer has 0 balance. Fund it at:"
  echo "  https://faucet.base.org  (Coinbase faucet — requires social verification)"
  echo "  https://www.alchemy.com/faucets/base-sepolia  (Alchemy faucet)"
  echo "  https://thirdweb.com/base-sepolia-testnet  (thirdweb faucet)"
  echo ""
  echo "Then re-run this script."
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
    --chain-id 84532 \
    --etherscan-api-key "$ETHERSCAN_KEY" \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" "$TREASURY" "$LIQUIDITY" "$TEAM") \
    --watch 2>&1 || echo "Token verification failed (can verify manually on Basescan)"
  
  forge verify-contract "$STAKING" src/PulsarStaking.sol:PulsarStaking \
    --chain-id 84532 \
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
echo "  DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "PULSAR_TOKEN=$TOKEN"
echo "PULSAR_STAKING=$STAKING"
echo ""
echo "Basescan links:"
echo "  Token:   https://sepolia.basescan.org/address/$TOKEN"
echo "  Staking: https://sepolia.basescan.org/address/$STAKING"
echo ""
echo "Next steps:"
echo "  1. Save these addresses to your .env:"
echo "     NEXT_PUBLIC_PULSAR_TOKEN=$TOKEN"
echo "     NEXT_PUBLIC_PULSAR_STAKING=$STAKING"
echo "  2. Fund staking rewards:"
echo "     cast send $TOKEN 'approve(address,uint256)' $STAKING 10000000000000000000000000 \\"
echo "       --rpc-url $RPC_URL --private-key \$DEPLOYER_PRIVATE_KEY"
echo "     cast send $STAKING 'topUpRewards(uint256)' 10000000000000000000000000 \\"
echo "       --rpc-url $RPC_URL --private-key \$DEPLOYER_PRIVATE_KEY"
echo "  3. Test stake/claim/unstake via the website or cast commands"
echo "  4. Set the env vars in your GitHub repo secrets + redeploy the website"
