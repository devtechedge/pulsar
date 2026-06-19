// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import "../src/Pulsar.sol";
import "../src/PulsarStaking.sol";

/**
 * @notice One-shot deployment for $PULSAR + staking on Base.
 *
 * Env vars:
 *   TREASURY  — multisig-controlled treasury wallet
 *   LIQUIDITY — wallet that will hold LP / receive liquidity-side tax
 *   TEAM      — team allocation wallet (or vesting contract)
 *
 * Deployer owns the contracts immediately after deploy; transfer to multisig
 * as part of post-deploy hardening.
 */
contract PulsarScript is Script {
    function run() external {
        address treasury = vm.envAddress("TREASURY");
        address liquidity = vm.envAddress("LIQUIDITY");
        address team = vm.envAddress("TEAM");

        require(treasury != address(0) && liquidity != address(0) && team != address(0),
            "Deploy: missing wallet env vars");

        vm.startBroadcast();

        Pulsar token = new Pulsar(treasury, liquidity, team);
        console.log("PULSAR token:", address(token));

        PulsarStaking staking = new PulsarStaking(address(token));
        console.log("PULSAR staking:", address(staking));

        // Whitelist staking contract from fees + limits so stake/unstake/claim
        // are never taxed.
        token.setExcludedFromFees(address(staking), true);
        token.setExcludedFromLimits(address(staking), true);

        vm.stopBroadcast();

        console.log("----");
        console.log("NEXT STEPS:");
        console.log("1. Add Uniswap V2 liquidity on Base");
        console.log("2. token.setAutomatedMarketMakerPair(pair, true)");
        console.log("3. token.enableTrading()");
        console.log("4. Lock liquidity via UNCX");
        console.log("5. Transfer ownership to multisig");
    }
}
