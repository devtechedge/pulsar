import { Background } from "@/components/sections/Background";
import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Tokenomics } from "@/components/sections/Tokenomics";
import { Utility } from "@/components/sections/Utility";
import { Roadmap } from "@/components/sections/Roadmap";
import { HowToBuy } from "@/components/sections/HowToBuy";
import { StakingDashboard } from "@/components/sections/StakingDashboard";
import { Trust } from "@/components/sections/Trust";
import { Community } from "@/components/sections/Community";
import { Footer } from "@/components/sections/Footer";

// New thematic feature sections (10 added in Step 2)
import { ComputeConsole } from "@/components/sections/ComputeConsole";
import { SupplierRegistry } from "@/components/sections/SupplierRegistry";
import { TokenMetricsDashboard } from "@/components/sections/TokenMetricsDashboard";
import { PricingOracle } from "@/components/sections/PricingOracle";
import { GovernanceExplorer } from "@/components/sections/GovernanceExplorer";
import { BurnTracker } from "@/components/sections/BurnTracker";
import { BridgeVisualizer } from "@/components/sections/BridgeVisualizer";
import { NetworkPulse } from "@/components/sections/NetworkPulse";
import { VestingCalendar } from "@/components/sections/VestingCalendar";
import { ModelMarketplace } from "@/components/sections/ModelMarketplace";

export default function Home() {
  return (
    <>
      <Background />
      <Nav />
      <main className="flex-1">
        {/* Foundation */}
        <Hero />
        <About />
        <HowItWorks />

        {/* Token economics */}
        <Tokenomics />
        <VestingCalendar />
        <BurnTracker />
        <TokenMetricsDashboard />

        {/* Live network */}
        <NetworkPulse />
        <PricingOracle />
        <BridgeVisualizer />

        {/* Compute ecosystem */}
        <ComputeConsole />
        <SupplierRegistry />
        <ModelMarketplace />

        {/* Governance & utility */}
        <GovernanceExplorer />
        <Utility />
        <Roadmap />
        <HowToBuy />
        <StakingDashboard />

        {/* Trust & community */}
        <Trust />
        <Community />
      </main>
      <Footer />
    </>
  );
}
