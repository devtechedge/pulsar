"use client";

import { ReactNode } from "react";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { chains, config } from "@/lib/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          chains={chains}
          theme={darkTheme({
            accentColor: "#7C3AED",
            accentColorForeground: "#FFFFFF",
            borderRadius: "medium",
            overlayBlur: "small",
            fontStack: "system",
          })}
          modalSize="compact"
          appInfo={{
            appName: "Pulsar",
            learnMoreUrl: "https://pulsarcompute.xyz",
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
