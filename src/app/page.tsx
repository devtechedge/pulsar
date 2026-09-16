"use client";

import dynamic from "next/dynamic";

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

// New thematic feature sections (added in Step 2)
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

// New UI layer (Step 3)
import { LoadingScreen } from "@/components/LoadingScreen";
import { SectionDivider } from "@/components/SectionDivider";
import { MobileBottomNav } from "@/components/MobileBottomNav";

/**
 * Pure chrome, split out of the entry chunk.
 *
 * The cursor, scroll indicator, Konami easter egg and activity toasts are
 * decorative: no content and no test depends on them, but they were pulling
 * their animation code into the bundle that blocks first paint. They mount a
 * beat later instead. `ssr: false` is legal here because this page is a Client
 * Component.
 */
const CursorSystem = dynamic(() => import("@/components/CursorSystem").then((m) => m.CursorSystem), {
  ssr: false,
});
const ScrollProgress3D = dynamic(
  () => import("@/components/ScrollProgress3D").then((m) => m.ScrollProgress3D),
  { ssr: false },
);
const KonamiBurst = dynamic(() => import("@/components/KonamiBurst").then((m) => m.KonamiBurst), {
  ssr: false,
});
const LiveActivityToasts = dynamic(
  () => import("@/components/LiveActivityToasts").then((m) => m.LiveActivityToasts),
  { ssr: false },
);

const SECTION_LIST = [
  <Hero key="hero" />,
  <About key="about" />,
  <HowItWorks key="how" />,
  <Tokenomics key="tokenomics" />,
  <VestingCalendar key="vesting" />,
  <BurnTracker key="burn" />,
  <TokenMetricsDashboard key="metrics" />,
  <NetworkPulse key="pulse" />,
  <PricingOracle key="oracle" />,
  <BridgeVisualizer key="bridge" />,
  <ComputeConsole key="console" />,
  <SupplierRegistry key="suppliers" />,
  <ModelMarketplace key="marketplace" />,
  <GovernanceExplorer key="governance" />,
  <Utility key="utility" />,
  <Roadmap key="roadmap" />,
  <HowToBuy key="how-to-buy" />,
  <StakingDashboard key="staking" />,
  <Trust key="trust" />,
  <Community key="community" />,
];

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <CursorSystem />
      <ScrollProgress3D />
      <KonamiBurst />
      <LiveActivityToasts />
      <Background />
      <Nav />
      <main className="flex-1">
        {SECTION_LIST.map((section, i) => (
          <div key={i}>
            {section}
            {i < SECTION_LIST.length - 1 && <SectionDivider />}
          </div>
        ))}
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
