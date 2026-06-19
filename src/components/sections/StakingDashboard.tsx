"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Coins, Lock, Unlock, Gift, LogOut, Loader2, AlertCircle } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { ConnectButton } from "@/components/ConnectButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { erc20Abi, pulsarAbi, stakingAbi, PULSAR } from "@/lib/contracts";
import { IS_LIVE } from "@/lib/wagmi";
import { formatCompact, formatPeriodFinish } from "@/lib/format";

const ZERO = "0x0000000000000000000000000000000000000000";

function fmtPul(amount: bigint | undefined, decimals = 4): string {
  if (!amount) return "0";
  const s = formatUnits(amount, 18);
  const n = Number(s);
  if (!isFinite(n)) return s;
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function StakingDashboard() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const live = IS_LIVE && PULSAR.token !== ZERO && PULSAR.staking !== ZERO;

  const [tab, setTab] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");

  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // ---- reads ----
  const userCalls = live && address
    ? [
        { address: PULSAR.token as `0x${string}`, abi: pulsarAbi, functionName: "balanceOf" as const, args: [address] as const },
        { address: PULSAR.staking as `0x${string}`, abi: stakingAbi, functionName: "userInfo" as const, args: [address] as const },
        { address: PULSAR.staking as `0x${string}`, abi: stakingAbi, functionName: "earned" as const, args: [address] as const },
        { address: PULSAR.token as `0x${string}`, abi: erc20Abi, functionName: "allowance" as const, args: [address, PULSAR.staking] as const },
      ]
    : [];

  const { data: userData } = useReadContracts({ contracts: userCalls });

  const { data: poolData } = useReadContracts({
    contracts: live
      ? [
          { address: PULSAR.staking as `0x${string}`, abi: stakingAbi, functionName: "totalStaked" as const },
          { address: PULSAR.staking as `0x${string}`, abi: stakingAbi, functionName: "currentAPYBps" as const },
          { address: PULSAR.staking as `0x${string}`, abi: stakingAbi, functionName: "rewardRate" as const },
          { address: PULSAR.staking as `0x${string}`, abi: stakingAbi, functionName: "periodFinish" as const },
        ]
      : [],
  });

  // unpack
  const balance = (userData?.[0]?.result as bigint | undefined) ?? 0n;
  const userInfo = userData?.[1]?.result as
    | readonly [bigint, bigint, bigint]
    | undefined;
  const staked = userInfo?.[0] ?? 0n;
  const earned = (userData?.[2]?.result as bigint | undefined) ?? 0n;
  const allowance = (userData?.[3]?.result as bigint | undefined) ?? 0n;

  const totalStaked = (poolData?.[0]?.result as bigint | undefined) ?? 0n;
  const apyBps = (poolData?.[1]?.result as bigint | undefined) ?? 0n;
  const rewardRate = (poolData?.[2]?.result as bigint | undefined) ?? 0n;
  const periodFinish = (poolData?.[3]?.result as bigint | undefined) ?? 0n;

  const apyPct = Number(apyBps) / 100;

  const parsedAmount = (() => {
    try {
      if (!amount) return 0n;
      return parseUnits(amount, 18);
    } catch {
      return 0n;
    }
  })();

  const needsApprove = tab === "stake" && parsedAmount > allowance;

  function notify(title: string, description?: string, variant?: "default" | "destructive") {
    toast({ title, description, variant });
  }

  async function handleSubmit() {
    if (!live || !address) return;
    if (parsedAmount <= 0n) {
      notify("Enter an amount", "Amount must be greater than zero.", "destructive");
      return;
    }
    try {
      if (tab === "stake") {
        if (needsApprove) {
          const h = await writeContractAsync({
            address: PULSAR.token as `0x${string}`,
            abi: erc20Abi,
            functionName: "approve",
            args: [PULSAR.staking as `0x${string}`, parsedAmount],
          });
          setTxHash(h);
          notify("Approving $PULSAR…", "Confirm the approval in your wallet.");
        } else {
          const h = await writeContractAsync({
            address: PULSAR.staking as `0x${string}`,
            abi: stakingAbi,
            functionName: "stake",
            args: [parsedAmount],
          });
          setTxHash(h);
          notify("Staking…", "Confirm the stake in your wallet.");
        }
      } else {
        if (parsedAmount > staked) {
          notify("Amount too high", "You cannot unstake more than your staked balance.", "destructive");
          return;
        }
        const h = await writeContractAsync({
          address: PULSAR.staking as `0x${string}`,
          abi: stakingAbi,
          functionName: "unstake",
          args: [parsedAmount],
        });
        setTxHash(h);
        notify("Unstaking…", "Confirm the unstake in your wallet.");
      }
    } catch (e) {
      notify("Transaction rejected", (e as Error)?.message?.slice(0, 120), "destructive");
    }
  }

  async function handleClaim() {
    if (!live || !address) return;
    if (earned <= 0n) {
      notify("Nothing to claim", "You have no pending rewards yet.", "destructive");
      return;
    }
    try {
      const h = await writeContractAsync({
        address: PULSAR.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "claim",
      });
      setTxHash(h);
      notify("Claiming rewards…", "Confirm the claim in your wallet.");
    } catch (e) {
      notify("Claim rejected", (e as Error)?.message?.slice(0, 120), "destructive");
    }
  }

  async function handleExit() {
    if (!live || !address) return;
    try {
      const h = await writeContractAsync({
        address: PULSAR.staking as `0x${string}`,
        abi: stakingAbi,
        functionName: "exit",
      });
      setTxHash(h);
      notify("Exiting position…", "Unstaking all + claiming rewards.");
    } catch (e) {
      notify("Exit rejected", (e as Error)?.message?.slice(0, 120), "destructive");
    }
  }

  // confirmed toast
  if (isConfirmed && txHash) {
    setTimeout(() => {
      notify("Transaction confirmed", "Your balance will update shortly.");
      setTxHash(undefined);
      setAmount("");
    }, 0);
  }

  const busy = isWriting || isConfirming;

  return (
    <section id="staking" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <SectionHeading
        eyebrow="Staking"
        title="Stake $PULSAR, earn $PULSAR"
        subtitle="Lock your tokens to earn protocol rewards. Configurable APY set by the multisig."
      />

      {!live && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-8 flex max-w-3xl items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          <AlertCircle className="size-4 shrink-0" />
          Staking contract deploying in Phase 2. This UI is live for preview with placeholder values.
        </motion.div>
      )}

      {!isConnected && live ? (
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-4 rounded-2xl glass p-10 text-center">
          <Lock className="size-8 text-pulsar-violet" />
          <h3 className="font-display text-xl font-bold">Connect your wallet</h3>
          <p className="text-sm text-muted-foreground">
            Connect a Base wallet to view your balance, stake $PULSAR, and claim rewards.
          </p>
          <ConnectButton />
        </div>
      ) : (
        <>
          {/* 3-card grid */}
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {/* Balance card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              className="glass glass-hover rounded-2xl p-6"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-pulsar-violet/15 text-pulsar-violet ring-1 ring-pulsar-violet/30">
                <Coins className="size-5" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Your position</h3>

              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Wallet balance</dt>
                  <dd className="font-display text-2xl font-bold">{fmtPul(balance)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Staked balance</dt>
                  <dd className="font-display text-2xl font-bold text-gradient">{fmtPul(staked)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pending rewards</dt>
                  <dd className="font-display text-2xl font-bold text-pulsar-cyan">{fmtPul(earned)}</dd>
                </div>
              </dl>
            </motion.div>

            {/* Stake form card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
              viewport={{ once: true, margin: "-80px" }}
              className="glass glass-hover rounded-2xl p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Manage stake</h3>
                {busy ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-pulsar-cyan">
                    <Loader2 className="size-3 animate-spin" />
                    {isConfirming ? "Confirming…" : "Signing…"}
                  </span>
                ) : null}
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "stake" | "unstake")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stake" className="gap-1.5">
                    <Lock className="size-3.5" /> Stake
                  </TabsTrigger>
                  <TabsTrigger value="unstake" className="gap-1.5">
                    <Unlock className="size-3.5" /> Unstake
                  </TabsTrigger>
                </TabsList>

                {(["stake", "unstake"] as const).map((mode) => (
                  <TabsContent key={mode} value={mode} className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{mode === "stake" ? "Available" : "Staked"}</span>
                      <span className="font-mono">
                        {fmtPul(mode === "stake" ? balance : staked)} $PULSAR
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        placeholder="0.0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={busy || !live}
                        className="h-12 pr-16 font-mono text-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAmount(
                            mode === "stake"
                              ? formatUnits(balance, 18)
                              : formatUnits(staked, 18)
                          )
                        }
                        disabled={busy || !live}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-white/5 px-2.5 py-1 text-xs font-semibold text-pulsar-cyan hover:bg-white/10 disabled:opacity-40"
                      >
                        Max
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={busy || !live}
                      className="h-12 w-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {mode === "stake" && needsApprove ? "Approving…" : "Working…"}
                        </>
                      ) : mode === "stake" && needsApprove ? (
                        <>
                          <Lock className="size-4" /> Approve &amp; Stake
                        </>
                      ) : mode === "stake" ? (
                        <>
                          <Lock className="size-4" /> Stake
                        </>
                      ) : (
                        <>
                          <Unlock className="size-4" /> Unstake
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {mode === "stake"
                        ? "Approve the staking contract to spend your $PULSAR, then stake. One tx if already approved."
                        : "Unstaked $PULSAR returns to your wallet immediately. Rewards stay claimable."}
                    </p>
                  </TabsContent>
                ))}
              </Tabs>
            </motion.div>

            {/* Pool stats card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
              viewport={{ once: true, margin: "-80px" }}
              className="glass glass-hover rounded-2xl p-6"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-pulsar-cyan/15 text-pulsar-cyan ring-1 ring-pulsar-cyan/30">
                <Gift className="size-5" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Pool stats</h3>

              <dl className="mt-4 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <dt className="text-xs text-muted-foreground">Total staked</dt>
                    <dd className="font-display text-2xl font-bold">{fmtPul(totalStaked)}</dd>
                  </div>
                  <span className="text-xs text-muted-foreground">$PULSAR</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <dt className="text-xs text-muted-foreground">Current APY</dt>
                    <dd className="font-display text-2xl font-bold text-gradient">
                      {isFinite(apyPct) ? apyPct.toFixed(1) : "0"}%
                    </dd>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <dt className="text-xs text-muted-foreground">Reward rate</dt>
                    <dd className="font-mono text-sm font-semibold">
                      {fmtPul(rewardRate, 6)}/s
                    </dd>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <dt className="text-xs text-muted-foreground">Period finish</dt>
                    <dd className="font-mono text-sm font-semibold">
                      {formatPeriodFinish(periodFinish)}
                    </dd>
                  </div>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                {formatCompact(totalStaked)} $PULSAR locked across all stakers.
              </p>
            </motion.div>
          </div>

          {/* Claim row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-80px" }}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <Button
              type="button"
              onClick={handleClaim}
              disabled={busy || !live}
              className="h-12 flex-1 bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
              Claim {fmtPul(earned)} $PULSAR
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleExit}
              disabled={busy || !live}
              className="gradient-border h-12 glass px-6 text-base font-semibold text-foreground hover:text-pulsar-cyan disabled:opacity-50"
            >
              <LogOut className="size-4" /> Exit (unstake all + claim)
            </Button>
          </motion.div>
        </>
      )}
    </section>
  );
}
