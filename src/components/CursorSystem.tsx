"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Detect if the cursor system should be enabled (desktop hover + no reduced motion).
 * Uses useSyncExternalStore to avoid the setState-in-effect lint rule.
 */
function subscribeCursorEnabled(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq1 = window.matchMedia("(hover: none)");
  const mq2 = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq1.addEventListener?.("change", cb);
  mq2.addEventListener?.("change", cb);
  return () => {
    mq1.removeEventListener?.("change", cb);
    mq2.removeEventListener?.("change", cb);
  };
}
function readCursorEnabled() {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(hover: none)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ... (rest of component docstring)

type CursorMode = "default" | "button" | "card" | "input" | "canvas" | "disabled";

const MODE_SIZE: Record<CursorMode, { ring: number; dot: number; opacity: number }> = {
  default: { ring: 32, dot: 6, opacity: 1 },
  button: { ring: 24, dot: 8, opacity: 1 },
  card: { ring: 48, dot: 0, opacity: 1 },
  input: { ring: 0, dot: 0, opacity: 1 }, // I-beam handled via CSS
  canvas: { ring: 40, dot: 4, opacity: 1 },
  disabled: { ring: 0, dot: 0, opacity: 0.5 },
};

export function CursorSystem() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<HTMLDivElement>(null);
  const enabled = useSyncExternalStore(subscribeCursorEnabled, readCursorEnabled, () => false);
  const [mode, setMode] = useState<CursorMode>("default");
  const [clicking, setClicking] = useState(false);

  // Mouse + animation state in refs (no re-renders during rAF loop).
  const mouse = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const dot = useRef({ x: -100, y: -100 });
  const magneticOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    // Add CSS to hide native cursor.
    const style = document.createElement("style");
    style.innerHTML = `
      * { cursor: none !important; }
      .cursor-ripple {
        position: fixed;
        top: 0; left: 0;
        width: 32px; height: 32px;
        border-radius: 50%;
        border: 1.5px solid transparent;
        background: linear-gradient(135deg, #7C3AED, #22D3EE) border-box;
        -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        animation: cursor-ripple 600ms ease-out forwards;
      }
      @keyframes cursor-ripple {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      // Detect what's under the cursor.
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        setMode("input");
        return;
      }
      if (target.closest("canvas")) {
        setMode("canvas");
        return;
      }
      if (target.closest("button, a, [role=button], [role=tab]")) {
        setMode("button");
        return;
      }
      if (target.closest(".glass, .glass-hover, [data-cursor=card]")) {
        setMode("card");
        return;
      }
      setMode("default");
    };

    const onDown = (e: MouseEvent) => {
      setClicking(true);
      // Spawn ripple.
      const ripple = document.createElement("div");
      ripple.className = "cursor-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      ripplesRef.current?.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    const onUp = () => setClicking(false);

    // Magnetic effect for CTAs.
    const magnetSelector = "[data-magnetic='true']";
    const magnetElements = Array.from(document.querySelectorAll(magnetSelector));

    const raf = () => {
      // Magnetic offset — bend cursor toward nearest magnetic CTA within 80px.
      let mx = 0;
      let my = 0;
      for (const el of magnetElements) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - mouse.current.x;
        const dy = cy - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const strength = (1 - dist / 120) * 14;
          mx = (dx / dist) * strength;
          my = (dy / dist) * strength;
          break;
        }
      }
      magneticOffset.current.x = mx;
      magneticOffset.current.y = my;

      // Lerp ring (slower) and dot (faster) toward mouse + magnetic offset.
      const targetRingX = mouse.current.x + mx * 0.4;
      const targetRingY = mouse.current.y + my * 0.4;
      const targetDotX = mouse.current.x + mx;
      const targetDotY = mouse.current.y + my;

      ring.current.x += (targetRingX - ring.current.x) * 0.15;
      ring.current.y += (targetRingY - ring.current.y) * 0.15;
      dot.current.x += (targetDotX - dot.current.x) * 0.45;
      dot.current.y += (targetDotY - dot.current.y) * 0.45;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dot.current.x}px, ${dot.current.y}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(raf);
    };
    let rafId = requestAnimationFrame(raf);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      style.remove();
    };
  }, []);

  if (!enabled) return null;

  const sizes = MODE_SIZE[mode];
  const ringStyle: React.CSSProperties = {
    width: sizes.ring,
    height: sizes.ring,
    opacity: sizes.opacity,
    transition: "width 200ms ease, height 200ms ease, opacity 200ms ease",
  };
  const dotStyle: React.CSSProperties = {
    width: sizes.dot,
    height: sizes.dot,
    opacity: sizes.opacity,
    transition: "width 200ms ease, height 200ms ease, opacity 200ms ease",
  };

  return (
    <>
      {/* Ring */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full"
        style={{
          ...ringStyle,
          background:
            mode === "card"
              ? "transparent"
              : "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(34,211,238,0.25))",
          border:
            mode === "card"
              ? "1px dashed rgba(124,58,237,0.6)"
              : "1.5px solid rgba(124,58,237,0.6)",
          boxShadow:
            mode === "button"
              ? "0 0 20px rgba(124,58,237,0.4), inset 0 0 8px rgba(34,211,238,0.3)"
              : "0 0 12px rgba(124,58,237,0.2)",
          transform: clicking ? "translate(-50%, -50%) scale(1.4)" : undefined,
        }}
      />
      {/* Dot */}
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full"
        style={{
          ...dotStyle,
          background: "linear-gradient(135deg, #7C3AED, #22D3EE)",
          boxShadow: "0 0 8px rgba(124,58,237,0.8)",
        }}
      />
      {/* Ripple container */}
      <div ref={ripplesRef} aria-hidden className="pointer-events-none fixed inset-0 z-[9998]" />
    </>
  );
}
