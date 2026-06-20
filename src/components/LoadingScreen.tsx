"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";

// Detect reduced motion without setState-in-effect.
function subscribeReduced(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}
function readReduced() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Detect whether this session has already seen the loader (so we skip it).
function subscribeLoaded(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function readLoaded() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("pulsar-loaded") === "1";
  } catch {
    return false;
  }
}

/**
 * Initial page loader — particles coalesce into a Pulsar star over 1.2s,
 * then fade out. Only shows on first load (sessionStorage gated).
 */
export function LoadingScreen() {
  const reducedMotion = useSyncExternalStore(subscribeReduced, readReduced, () => false);
  const alreadyLoaded = useSyncExternalStore(subscribeLoaded, readLoaded, () => false);
  const [loading, setLoading] = useState(!alreadyLoaded);

  useEffect(() => {
    if (!loading) return;
    const duration = reducedMotion ? 200 : 1400;
    const t = setTimeout(() => {
      setLoading(false);
      try {
        sessionStorage.setItem("pulsar-loaded", "1");
      } catch {}
    }, duration);
    return () => clearTimeout(t);
  }, [loading, reducedMotion]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-cosmos"
          aria-hidden
        >
          <div className="relative size-40">
            {/* Coalescing particles */}
            {!reducedMotion &&
              Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                const dist = 80;
                return (
                  <motion.div
                    key={i}
                    initial={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist,
                      opacity: 0,
                      scale: 0.4,
                    }}
                    animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [0.4, 1.2, 0] }}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.015,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute left-1/2 top-1/2 size-1.5 rounded-full"
                    style={{
                      background: i % 2 === 0 ? "#7C3AED" : "#22D3EE",
                      boxShadow: "0 0 6px currentColor",
                    }}
                  />
                );
              })}
            {/* Central forming star */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, #FFFFFF 0%, #C4B5FD 30%, #7C3AED 60%, transparent 80%)",
                boxShadow: "0 0 60px rgba(124,58,237,0.8)",
              }}
            />
            {/* Pulse rings */}
            {[0, 0.4, 0.8].map((delay, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.3, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  duration: 1.4,
                  delay: 0.5 + delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pulsar/40"
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
