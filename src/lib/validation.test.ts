import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ZERO_ADDRESS,
  isHexAddress,
  isZeroAddress,
  isConfiguredAddress,
  clampBps,
  taxSharesSum,
} from "./validation.ts";

describe("isHexAddress", () => {
  it("accepts a well-formed 20-byte address", () => {
    assert.equal(
      isHexAddress("0x1234567890abcdef1234567890abcdef12345678"),
      true
    );
    assert.equal(isHexAddress(ZERO_ADDRESS), true);
  });

  it("rejects truncated, unprefixed, or non-string values", () => {
    assert.equal(isHexAddress("0x1234"), false);
    assert.equal(isHexAddress("1234567890abcdef1234567890abcdef12345678"), false);
    assert.equal(isHexAddress(""), false);
    assert.equal(isHexAddress(null), false);
    assert.equal(isHexAddress({ addr: ZERO_ADDRESS }), false);
  });
});

describe("isZeroAddress / isConfiguredAddress", () => {
  it("treats the canonical zero address as not live", () => {
    assert.equal(isZeroAddress(ZERO_ADDRESS), true);
    assert.equal(isZeroAddress(ZERO_ADDRESS.toUpperCase()), true);
    assert.equal(isConfiguredAddress(ZERO_ADDRESS), false);
  });

  it("accepts a non-zero hex address as configured", () => {
    const live = "0x1111111111111111111111111111111111111111";
    assert.equal(isConfiguredAddress(live), true);
  });
});

describe("clampBps", () => {
  it("floors and clamps to [0, max]", () => {
    assert.equal(clampBps(200), 200);
    assert.equal(clampBps(200.9), 200);
    assert.equal(clampBps(-1), 0);
    assert.equal(clampBps(999, 500), 500);
    assert.equal(clampBps(Number.NaN), 0);
  });
});

describe("taxSharesSum", () => {
  it("adds the three tax buckets", () => {
    assert.equal(
      taxSharesSum({ treasury: 5000, liquidity: 2500, burn: 2500 }),
      10000
    );
  });
});
