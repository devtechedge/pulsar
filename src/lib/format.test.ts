import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatCompact,
  formatFull,
  truncateAddress,
  resolveChartColor,
  formatPeriodFinish,
} from "./format.ts";

describe("formatCompact", () => {
  it("formats millions and billions", () => {
    assert.equal(formatCompact(1_200_000_000), "1.2B");
    assert.equal(formatCompact(350_000_000), "350M");
  });
});

describe("formatFull", () => {
  it("groups thousands", () => {
    assert.equal(formatFull(1_000_000_000), "1,000,000,000");
  });
});

describe("truncateAddress", () => {
  it("returns empty for falsy input", () => {
    assert.equal(truncateAddress(""), "");
  });

  it("keeps short strings intact", () => {
    assert.equal(truncateAddress("0xab"), "0xab");
  });

  it("truncates a full address with an ellipsis", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    assert.equal(truncateAddress(addr, 4), "0x1234…5678");
  });
});

describe("resolveChartColor", () => {
  it("maps CSS variable tokens to hex", () => {
    assert.equal(resolveChartColor("var(--chart-1)"), "#8B5CF6");
    assert.equal(resolveChartColor("#fff"), "#fff");
  });
});

describe("formatPeriodFinish", () => {
  it("renders a dash for zero / missing", () => {
    assert.equal(formatPeriodFinish(0n), "—");
  });
});
