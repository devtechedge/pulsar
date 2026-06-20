"use client";

import { createContext, useContext, useEffect, useCallback, ReactNode, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Read the current theme from <html> without triggering the setState-in-effect lint rule.
function subscribeTheme(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("theme-change", cb);
  return () => window.removeEventListener("theme-change", cb);
}
function readThemeClient(): Theme {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.dataset.theme as Theme) || "dark";
}
function readThemeServer(): Theme {
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR-safe: render as "dark" on server, hydrate to actual theme on mount.
  const theme = useSyncExternalStore(subscribeTheme, readThemeClient, readThemeServer);

  // Re-apply theme after hydration — React 19 strips script-applied classes
  // during hydration commit, so we need to re-set them in useEffect.
  // This is safe because it runs after the initial paint.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("pulsar-theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const next: Theme = (stored as Theme) || (systemDark ? "dark" : "light");
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      root.classList.add(next);
      root.dataset.theme = next;
      root.style.colorScheme = next;
    } catch {}
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(next);
    root.dataset.theme = next;
    root.style.colorScheme = next;
    try {
      localStorage.setItem("pulsar-theme", next);
    } catch {}
    // Dispatch event so 3D components + background can react.
    window.dispatchEvent(new CustomEvent("theme-change", { detail: next }));
  }, []);

  const setTheme = useCallback((t: Theme) => applyTheme(t), [applyTheme]);

  const toggle = useCallback(() => {
    const current = (document.documentElement.dataset.theme as Theme) || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}


