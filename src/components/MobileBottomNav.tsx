"use client";

import Link from "next/link";
import { Home, Radio, Coins, ShoppingCart, Menu } from "lucide-react";
import { useState, useEffect } from "react";

const ITEMS = [
  { href: "#top", label: "Home", icon: Home },
  { href: "#pulse", label: "Network", icon: Radio },
  { href: "#staking", label: "Stake", icon: Coins },
  { href: "#how-to-buy", label: "Buy", icon: ShoppingCart },
];

/**
 * Mobile bottom navigation — surfaces key actions without the hamburger menu.
 * Hidden on desktop (lg+).
 */
export function MobileBottomNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only after user scrolls past hero (so it doesn't cover the hero CTAs).
    const onScroll = () => setVisible(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Determine if mobile.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 1023px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[55] lg:hidden transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-label="Mobile bottom"
    >
      <div className="mx-3 mb-3 flex items-center justify-around rounded-2xl glass-v2 p-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <Icon className="size-4" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <a
          href="#about"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            // Trigger hamburger via custom event.
            window.dispatchEvent(new CustomEvent("open-mobile-nav"));
          }}
        >
          <Menu className="size-4" />
          <span className="text-[10px] font-medium">More</span>
        </a>
      </div>
    </nav>
  );
}
