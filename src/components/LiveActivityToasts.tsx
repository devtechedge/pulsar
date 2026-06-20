"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Flame, Cpu, Activity, X } from "lucide-react";
import { mulberry32, genAddress } from "@/lib/mock-data";

type Activity = {
  id: number;
  text: string;
  icon: "burn" | "supplier" | "network";
  amount?: string;
};

const TEMPLATES: Array<Omit<Activity, "id">> = [
  { text: "Supplier EU-CENTRAL-1 just earned", icon: "supplier", amount: "4.2 $PULSAR" },
  { text: "Burn #8321 just happened:", icon: "burn", amount: "12,400 $PULSAR" },
  { text: "New inference job settled:", icon: "network", amount: "0.5 $PULSAR" },
  { text: "Supplier US-WEST-2a just earned", icon: "supplier", amount: "8.7 $PULSAR" },
  { text: "1,247 nodes now online", icon: "network" },
  { text: "Quarterly burn in 47d 12h", icon: "burn" },
  { text: "Supplier ASIA-PAC just earned", icon: "supplier", amount: "2.1 $PULSAR" },
  { text: "Cumulative burned: 12,512,840 $PULSAR", icon: "burn" },
  { text: "Network throughput: 12.4 jobs/sec", icon: "network" },
];

/**
 * Cosmetic toasts that slide in from bottom-right every 30-60s.
 * Pauses when scrolled away from hero (top 100vh).
 */
export function LiveActivityToasts() {
  const [toasts, setToasts] = useState<Activity[]>([]);
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      setPaused(window.scrollY > window.innerHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  useEffect(() => {
    if (dismissed || paused) return;
    let nextId = 1;
    const rng = mulberry32(Date.now() & 0xffff);

    const spawn = () => {
      const tmpl = TEMPLATES[Math.floor(rng() * TEMPLATES.length)];
      const toast: Activity = { ...tmpl, id: nextId++ };
      setToasts((prev) => [...prev.slice(-2), toast]); // max 3 visible
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5500);
    };

    // First spawn after 8s, then every 30-60s.
    const first = setTimeout(spawn, 8000);
    const interval = setInterval(spawn, 35000 + Math.floor(rng() * 25000));
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [paused, dismissed]);

  if (dismissed) return null;

  const Icon = ({ type }: { type: Activity["icon"] }) => {
    if (type === "burn") return <Flame className="size-3.5 text-orange-400" />;
    if (type === "supplier") return <Cpu className="size-3.5 text-pulsar-cyan" />;
    return <Activity className="size-3.5 text-pulsar-violet" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[55] flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, x: 100, y: 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="glass glass-hover relative overflow-hidden rounded-xl p-3 pr-8"
        >
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 rounded-md bg-white/5 p-1.5">
              <Icon type={t.icon} />
            </div>
            <div className="flex-1 text-xs leading-snug text-foreground/90">
              {t.text}
              {t.amount && (
                <div className="mt-0.5 font-mono text-sm font-bold text-gradient">
                  {t.amount}
                </div>
              )}
            </div>
          </div>
          {/* auto-dismiss progress bar */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5.5, ease: "linear" }}
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pulsar-violet to-pulsar-cyan"
          />
        </motion.div>
      ))}
      {toasts.length > 0 && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-1 self-end text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground"
        >
          Hide all
        </button>
      )}
    </div>
  );
}
