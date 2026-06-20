"use client";

import { useInsertionEffect } from "react";

/**
 * Synchronously applies the theme class to <html> before the first paint.
 * useInsertionEffect runs before useEffect, before the browser paints.
 * Pairs with the inline script in layout.tsx (which runs even earlier, before
 * React hydrates) to provide a layered FOUC-prevention strategy.
 */
export function ThemeBootstrap() {
  useInsertionEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("pulsar-theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme: "dark" | "light" = (stored as "dark" | "light") || (systemDark ? "dark" : "light");
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      root.classList.add(theme);
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      console.log("[ThemeBootstrap] applied", theme, "→", root.className);
    } catch (e) {
      console.error("[ThemeBootstrap] failed", e);
    }
  }, []);
  return null;
}
