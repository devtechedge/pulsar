"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ChevronDown, Radio } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectButton } from "@/components/ConnectButton";
import { asset } from "@/lib/asset";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#tokenomics", label: "Tokenomics" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#how-to-buy", label: "Buy" },
  { href: "#staking", label: "Staking" },
];

// Network / ecosystem dropdown — 10 new thematic sections grouped into 3 categories
const NETWORK_GROUPS = [
  {
    label: "Token Economics",
    items: [
      { href: "#vesting", label: "Vesting Calendar", desc: "On-chain unlock schedule" },
      { href: "#burn", label: "Burn Tracker", desc: "Live buyback-and-burn" },
      { href: "#metrics", label: "Token Metrics", desc: "On-chain dashboard" },
    ],
  },
  {
    label: "Live Network",
    items: [
      { href: "#pulse", label: "Network Pulse", desc: "Live compute job monitor" },
      { href: "#oracle", label: "Pricing Oracle", desc: "Cost per AI workload" },
      { href: "#bridge", label: "Bridge Visualizer", desc: "Cross-chain routing" },
    ],
  },
  {
    label: "Compute Ecosystem",
    items: [
      { href: "#console", label: "Compute Console", desc: "Run an inference job" },
      { href: "#suppliers", label: "Supplier Registry", desc: "Become a node operator" },
      { href: "#marketplace", label: "Model Marketplace", desc: "Browse AI models" },
      { href: "#governance", label: "DAO Governance", desc: "Proposals & voting" },
    ],
  },
];

// Mobile: flattened list with category labels
const MOBILE_NETWORK = NETWORK_GROUPS.flatMap((g) => [
  { label: g.label, isHeader: true },
  ...g.items.map((i) => ({ ...i, isHeader: false })),
]);

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-cosmos/70 backdrop-blur-xl">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary"
      >
        {/* Brand */}
        <Link
          href="#top"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="Pulsar home"
        >
          <img src={asset("/pulsar.svg")} alt="Pulsar logo" className="h-8 w-8" />
          <span className="font-display text-xl font-bold tracking-tight">
            Pulsar
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/5"
            >
              {l.label}
            </Link>
          ))}

          {/* Network dropdown — surfaces the 10 new sections */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/5"
              >
                <Radio className="size-3.5 text-pulsar-cyan" />
                Network
                <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[420px] border-white/10 bg-cosmos/95 p-2 backdrop-blur-xl"
              sideOffset={8}
            >
              {NETWORK_GROUPS.map((group, gi) => (
                <div key={group.label}>
                  {gi > 0 && <DropdownMenuSeparator className="my-2 bg-white/5" />}
                  <DropdownMenuLabel className="px-2 text-xs font-semibold uppercase tracking-widest text-pulsar-cyan">
                    {group.label}
                  </DropdownMenuLabel>
                  {group.items.map((item) => (
                    <DropdownMenuItem asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="flex flex-col gap-0.5 rounded-md px-2 py-2 hover:bg-white/5 hover:cursor-pointer"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.desc}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="hidden sm:inline-flex text-sm font-semibold text-foreground hover:text-pulsar-cyan"
          >
            <Link href="#how-to-buy">Buy $PULSAR</Link>
          </Button>
          <div className="hidden sm:block">
            <ConnectButton />
          </div>

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-white/5 lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-80 overflow-y-auto border-l border-white/5 bg-cosmos/95 p-6"
            >
              <div className="mb-6 flex items-center gap-2.5">
                <img src={asset("/pulsar.svg")} alt="Pulsar logo" className="h-8 w-8" />
                <span className="font-display text-xl font-bold">Pulsar</span>
              </div>
              <nav className="flex flex-col gap-0.5" aria-label="Mobile">
                {NAV_LINKS.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded-md px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/5"
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}

                <div className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-widest text-pulsar-cyan">
                  Network
                </div>
                {MOBILE_NETWORK.map((item, i) =>
                  item.isHeader ? (
                    <div
                      key={`h-${i}`}
                      className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70"
                    >
                      {item.label}
                    </div>
                  ) : (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="flex flex-col rounded-md px-3 py-2 hover:bg-white/5"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.desc}
                        </span>
                      </Link>
                    </SheetClose>
                  )
                )}
              </nav>
              <div className="mt-6 flex flex-col gap-3">
                <SheetClose asChild>
                  <Button asChild className="w-full bg-gradient-to-r from-pulsar-violet to-pulsar-cyan animate-gradient text-white">
                    <Link href="#how-to-buy">Buy $PULSAR</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
