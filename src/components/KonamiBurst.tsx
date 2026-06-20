"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

/**
 * Easter egg: typing ↑↑↓↓←→←→ B A triggers a 5-second full-screen Pulsar burst.
 */
export function KonamiBurst() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setProgress((prev) => {
        const next = [...prev, e.key].slice(-KONAMI.length);
        if (next.length === KONAMI.length && next.every((k, i) => k === KONAMI[i])) {
          setActive(true);
          setTimeout(() => setActive(false), 5000);
          return [];
        }
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
          aria-hidden
        >
          <div className="relative size-96">
            {/* Converging particles */}
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i / 60) * Math.PI * 2;
              const dist = 400;
              return (
                <motion.div
                  key={`in-${i}`}
                  initial={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                  transition={{ duration: 1.5, delay: i * 0.005, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-1/2 top-1/2 size-2 rounded-full"
                  style={{
                    background: i % 3 === 0 ? "#7C3AED" : i % 3 === 1 ? "#22D3EE" : "#F472B6",
                    boxShadow: `0 0 8px currentColor`,
                  }}
                />
              );
            })}
            {/* Central burst */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2, 8], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, delay: 1.4, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: "radial-gradient(circle, #FFFFFF 0%, #C4B5FD 30%, #7C3AED 60%, transparent 80%)",
              }}
            />
            {/* Exploding particles */}
            {Array.from({ length: 80 }).map((_, i) => {
              const angle = (i / 80) * Math.PI * 2;
              const speed = 300 + Math.random() * 200;
              return (
                <motion.div
                  key={`out-${i}`}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed,
                    opacity: [0, 1, 0],
                    scale: [0, 1.2, 0],
                  }}
                  transition={{ duration: 2.5, delay: 1.5, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2 size-1.5 rounded-full"
                  style={{
                    background: i % 2 === 0 ? "#7C3AED" : "#22D3EE",
                    boxShadow: `0 0 8px currentColor`,
                  }}
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
