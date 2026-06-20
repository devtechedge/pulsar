/**
 * Shared deterministic mock-data helpers for PULSAR marketing sections.
 *
 * Every helper here is pure & deterministic so SSR output matches client
 * hydration exactly. Live "ticking" is layered on top via setInterval in
 * component effects.
 */

// --- Seeded PRNG (mulberry32) ------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a deterministic element from arr using a PRNG. */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

/** Integer in [min, max] inclusive. */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Float in [min, max). */
export function randFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

// --- Address generation (deterministic-looking) -----------------------------

const HEX = "0123456789abcdef";

/** Normalize a PRNG, numeric seed, or string seed into a () => number. */
function asRng(seed: (() => number) | number | string): () => number {
  if (typeof seed === "function") return seed as () => number;
  if (typeof seed === "string") {
    // hash string to uint32
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return mulberry32(h);
  }
  return mulberry32(seed);
}

/**
 * Generate a deterministic 0x-prefixed 20-byte address.
 * Accepts a PRNG function, a numeric seed, or a string seed.
 */
export function genAddress(seed: (() => number) | number | string): `0x${string}` {
  const rng = asRng(seed);
  let out = "0x";
  for (let i = 0; i < 40; i++) {
    out += HEX[Math.floor(rng() * 16)];
  }
  return out as `0x${string}`;
}

/**
 * Generate a deterministic 0x-prefixed 32-byte tx hash.
 * Accepts a PRNG function, a numeric seed, or a string seed.
 */
export function genTxHash(seed: (() => number) | number | string): `0x${string}` {
  const rng = asRng(seed);
  let out = "0x";
  for (let i = 0; i < 64; i++) {
    out += HEX[Math.floor(rng() * 16)];
  }
  return out as `0x${string}`;
}

// --- Time helpers ------------------------------------------------------------

/** ms -> "47d 12h 34m 18s" style countdown string. */
export function formatCountdown(ms: number): {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  total: number;
} {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    days: String(days).padStart(2, "0"),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    total,
  };
}

/** Relative time formatting: "just now", "12s ago", "3m ago", "1h ago". */
export function timeAgo(secondsAgo: number): string {
  if (secondsAgo < 5) return "just now";
  if (secondsAgo < 60) return `${Math.floor(secondsAgo)}s ago`;
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  return `${Math.floor(secondsAgo / 86400)}d ago`;
}

// --- prefers-reduced-motion hook --------------------------------------------

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// --- Shared helpers (used by other PULSAR sections) -------------------------
// These small utilities are exported so neighboring section components can
// share a single deterministic-mock surface. Signatures are permissive so
// callers can pass either a PRNG function, a numeric seed, or a string seed.

/**
 * Generate a random walk step from a previous value.
 * @param prev   previous value
 * @param vol    volatility (max abs delta as fraction of prev)
 * @param min    optional clamp lower bound
 * @param max    optional clamp upper bound
 */
export function randomWalk(
  prev: number,
  vol: number,
  min?: number,
  max?: number
): number {
  const delta = (Math.random() - 0.5) * 2 * vol * Math.abs(prev || 1);
  let next = prev + delta;
  if (typeof min === "number" && next < min) next = min;
  if (typeof max === "number" && next > max) next = max;
  return next;
}

/**
 * Generate a deterministic sparkline series of `length` values.
 * @param seed   numeric seed
 * @param length number of points
 * @param start  starting value (default 100)
 * @param vol    per-step volatility as fraction of current value (default 0.05)
 */
export function sparkSeries(
  seed: number,
  length: number,
  start = 100,
  vol = 0.05
): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < length; i++) {
    const delta = (rng() - 0.5) * 2 * vol * Math.abs(v);
    v = Math.max(0.0001, v + delta);
    out.push(v);
  }
  return out;
}

/**
 * Short job id like "job-7f3a9b".
 * Accepts a numeric seed, string prefix, or nothing.
 */
export function genJobId(seed: number | string = "job"): string {
  if (typeof seed === "string") {
    const rng = mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    let s = "";
    for (let i = 0; i < 6; i++) {
      s += HEX[Math.floor(rng() * 16)];
    }
    return `${seed}-${s}`;
  }
  // numeric seed → deterministic
  const rng = mulberry32(seed);
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += HEX[Math.floor(rng() * 16)];
  }
  return `job-${s}`;
}

/**
 * Format a Date (or unix-ms timestamp) as "HH:MM:SS" (24h, UTC for SSR stability).
 */
export function formatClock(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/**
 * Format a Date (or unix-ms timestamp) as "MMM DD, HH:MM" (UTC for SSR stability).
 */
export function formatShortDateTime(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${months[date.getUTCMonth()]} ${pad(date.getUTCDate())}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

