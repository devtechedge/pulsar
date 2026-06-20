"use client";

import { useMemo, useState, useEffect } from "react";

/**
 * Fixed cosmic backdrop: starfield, nebula blobs, faint grid.
 * Pure CSS/SVG — no canvas. Pointer-events disabled.
 * Theme-aware: gold dust + lighter nebulas in light mode.
 */

// Deterministic pseudo-random so SSR + client match.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  top: number;
  left: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

export function Background() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const update = () =>
      setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    update();
    window.addEventListener("theme-change", update);
    return () => window.removeEventListener("theme-change", update);
  }, []);

  const stars = useMemo<Star[]>(() => {
    const rng = mulberry32(42);
    return Array.from({ length: 80 }, () => ({
      top: rng() * 100,
      left: rng() * 100,
      size: rng() * 2 + 0.6,
      opacity: rng() * 0.6 + 0.2,
      delay: rng() * 6,
      duration: rng() * 4 + 3,
    }));
  }, []);

  const isLight = theme === "light";

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-background"
    >
      {/* violet nebula — top-left */}
      <div
        className="absolute -top-40 -left-40 h-[60vh] w-[60vh] rounded-full animate-nebula"
        style={{
          background: isLight
            ? "radial-gradient(circle at 50% 50%, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.04) 40%, transparent 70%)"
            : "radial-gradient(circle at 50% 50%, rgba(124,58,237,0.30) 0%, rgba(124,58,237,0.08) 40%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      {/* cyan nebula — bottom-right */}
      <div
        className="absolute -bottom-40 -right-40 h-[55vh] w-[55vh] rounded-full animate-nebula"
        style={{
          background: isLight
            ? "radial-gradient(circle at 50% 50%, rgba(8,145,178,0.10) 0%, rgba(8,145,178,0.03) 40%, transparent 70%)"
            : "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0.05) 40%, transparent 70%)",
          filter: "blur(20px)",
          animationDelay: "-8s",
        }}
      />

      {/* faint grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isLight
            ? "linear-gradient(rgba(15,16,32,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,16,32,0.04) 1px, transparent 1px)"
            : "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(circle at 50% 30%, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 30%, black, transparent 70%)",
        }}
      />

      {/* starfield — gold dust in light mode */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: isLight ? "rgba(124,58,237,0.6)" : "white",
            opacity: isLight ? s.opacity * 0.5 : s.opacity,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
