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

export default function Home() {
  return (
    <>
      <Background />
      <Nav />
      <main className="flex-1">
        <Hero />
        <About />
        <HowItWorks />
        <Tokenomics />
        <Utility />
        <Roadmap />
        <HowToBuy />
        <StakingDashboard />
        <Trust />
        <Community />
      </main>
      <Footer />
    </>
  );
}
