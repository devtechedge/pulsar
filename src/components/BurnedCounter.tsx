"use client";

import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TOKENOMICS } from "@/lib/contracts";
import { formatCompact } from "@/lib/format";

export function BurnedCounter() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, TOKENOMICS.burnedSupply, {
      duration: 2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, count]);

  return (
    <span ref={ref} className="font-display text-4xl md:text-5xl font-bold text-gradient">
      {formatCompact(display)}
    </span>
  );
}
