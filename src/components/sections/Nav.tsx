"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
              className="w-80 border-l border-white/5 bg-cosmos/95 p-6"
            >
              <div className="mb-6 flex items-center gap-2.5">
                <img src={asset("/pulsar.svg")} alt="Pulsar logo" className="h-8 w-8" />
                <span className="font-display text-xl font-bold">Pulsar</span>
              </div>
              <nav className="flex flex-col gap-1" aria-label="Mobile">
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
