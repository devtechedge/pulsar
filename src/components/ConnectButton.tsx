"use client";

import { ConnectButton as RKConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pulsar-styled RainbowKit ConnectButton wrapper.
 * - Disconnected: gradient "Connect Wallet" button.
 * - Wrong network: "Switch to Base" warning button.
 * - Connected: truncated address pill (RainbowKit handles dropdown).
 */
export function ConnectButton({ className }: { className?: string }) {
  return (
    <RKConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const wrongNetwork = connected && chain?.unsupported;

        return (
          <div
            className={cn("flex items-center", !mounted && "opacity-0 pointer-events-none", className)}
            aria-hidden={!mounted}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pulsar/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Wallet className="size-4" />
                    Connect Wallet
                  </button>
                );
              }

              if (wrongNetwork) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                  >
                    <AlertTriangle className="size-4" />
                    Switch to Base
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="inline-flex items-center gap-2 rounded-full glass px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-pulsar/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Switch network"
                  >
                    <span className="size-2 rounded-full bg-emerald-400" />
                    {chain?.name || "Base"}
                  </button>
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-pulsar/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open account menu"
                  >
                    <span className="size-2 rounded-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan" />
                    {account?.displayBalance ? (
                      <span className="text-muted-foreground text-xs font-normal hidden sm:inline">
                        {account.displayBalance}
                      </span>
                    ) : null}
                    {account?.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RKConnectButton.Custom>
  );
}
