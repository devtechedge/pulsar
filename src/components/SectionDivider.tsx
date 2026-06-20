"use client";

import { motion } from "framer-motion";

/**
 * Animated wave divider between sections.
 * Subtle ~24px gradient wave that flows horizontally.
 */
export function SectionDivider({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <div
      className={`pointer-events-none relative h-6 w-full overflow-hidden ${className}`}
      style={{ transform: flip ? "rotate(180deg)" : undefined }}
      aria-hidden
    >
      <svg
        className="absolute left-1/2 h-12 w-[200%] -translate-x-1/2"
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`wave-grad-${flip ? "f" : "n"}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0" />
            <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 12 Q 150 4, 300 12 T 600 12 T 900 12 T 1200 12 L 1200 24 L 0 24 Z"
          fill={`url(#wave-grad-${flip ? "f" : "n"})`}
          initial={{ x: 0 }}
          animate={{ x: [0, -300, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
}
