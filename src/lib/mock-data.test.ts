import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mulberry32,
  pick,
  randInt,
  genAddress,
  genTxHash,
  formatCountdown,
  timeAgo,
  sparkSeries,
} from "./mock-data.ts";

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    assert.equal(a(), b());
    assert.equal(a(), b());
  });
});

describe("pick / randInt", () => {
  it("picks a member of the array", () => {
    const rng = mulberry32(7);
    const arr = ["a", "b", "c"] as const;
    assert.equal(arr.includes(pick(rng, arr)), true);
  });

  it("stays in range", () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 20; i++) {
      const n = randInt(rng, 1, 4);
      assert.ok(n >= 1 && n <= 4);
    }
  });
});

describe("genAddress / genTxHash", () => {
  it("returns a 42-char 0x address", () => {
    const addr = genAddress(1);
    assert.match(addr, /^0x[0-9a-f]{40}$/);
  });

  it("returns a 66-char 0x hash", () => {
    const hash = genTxHash(1);
    assert.match(hash, /^0x[0-9a-f]{64}$/);
  });

  it("is deterministic for numeric seeds", () => {
    assert.equal(genAddress(99), genAddress(99));
    assert.equal(genTxHash(99), genTxHash(99));
  });
});

describe("formatCountdown", () => {
  it("zero-pads units and floors negatives", () => {
    const z = formatCountdown(0);
    assert.equal(z.days, "00");
    assert.equal(z.hours, "00");
    assert.equal(z.total, 0);
    const n = formatCountdown(-5000);
    assert.equal(n.total, 0);
  });

  it("splits a mixed duration", () => {
    const ms = ((2 * 86400) + (3 * 3600) + (4 * 60) + 5) * 1000;
    const c = formatCountdown(ms);
    assert.equal(c.days, "02");
    assert.equal(c.hours, "03");
    assert.equal(c.minutes, "04");
    assert.equal(c.seconds, "05");
  });
});

describe("timeAgo", () => {
  it("uses the just-now bucket under 5s", () => {
    assert.equal(timeAgo(0), "just now");
    assert.equal(timeAgo(4), "just now");
  });

  it("formats seconds, minutes, hours, days", () => {
    assert.equal(timeAgo(12), "12s ago");
    assert.equal(timeAgo(180), "3m ago");
    assert.equal(timeAgo(7200), "2h ago");
    assert.equal(timeAgo(172800), "2d ago");
  });
});

describe("sparkSeries", () => {
  it("returns the requested length of positive values", () => {
    const s = sparkSeries(3, 8, 100, 0.05);
    assert.equal(s.length, 8);
    assert.ok(s.every((n) => n > 0));
  });
});
