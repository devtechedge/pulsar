"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { asset } from "@/lib/asset";

// Detect desktop viewport without setState-in-effect.
function subscribeDesktop(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}
function readDesktop() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 1024px)").matches;
}

/**
 * Fixed top-right 3D Pulsar logo that fills with gradient as the user scrolls.
 * Emits a pulse ring each time a new section is entered.
 *
 * Hidden on mobile (no hover affordance, takes header space).
 */
export function ScrollProgress3D() {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("top");
  const [pulseKey, setPulseKey] = useState(0);
  const lastSection = useRef("top");
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = useSyncExternalStore(subscribeDesktop, readDesktop, () => false);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0);

      const sections = Array.from(document.querySelectorAll("section[id]"));
      const mid = window.innerHeight / 2;
      for (let i = sections.length - 1; i >= 0; i--) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= mid) {
          const id = sections[i].id;
          if (id !== lastSection.current) {
            lastSection.current = id;
            setActiveSection(id);
            setPulseKey((k) => k + 1);
          }
          break;
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hidden on small screens (visible var comes from useSyncExternalStore above).

  if (!visible) return null;

  const ringCircumference = 2 * Math.PI * 22; // r=22
  const dashOffset = ringCircumference * (1 - progress);

  return (
    <div
      ref={containerRef}
      className="fixed right-6 top-24 z-[60] hidden lg:block"
      aria-hidden
    >
      <div className="relative size-14">
        {/* Pulse ring on section change */}
        <motion.div
          key={pulseKey}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border border-pulsar/40"
        />
        {/* SVG progress ring */}
        <svg className="absolute inset-0 size-14 -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="2"
          />
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="url(#scroll-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 150ms linear" }}
          />
          <defs>
            <linearGradient id="scroll-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center logo */}
        <div className="absolute inset-2 flex items-center justify-center">
          <img
            src={asset("/pulsar.svg")}
            alt=""
            className="size-7 opacity-80"
            style={{
              filter: "drop-shadow(0 0 6px rgba(124,58,237,0.6))",
              transform: `rotate(${progress * 360}deg)`,
              transition: "transform 150ms linear",
            }}
          />
        </div>
      </div>
      <div className="mt-1 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {Math.round(progress * 100)}%
      </div>
    </div>
  );
}
