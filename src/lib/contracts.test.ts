import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TOKENOMICS } from "./tokenomics.ts";
import { taxSharesSum, clampBps } from "./validation.ts";

describe("TOKENOMICS", () => {
  it("allocations sum to 100% and 1B supply", () => {
    const pct = TOKENOMICS.allocations.reduce((s, a) => s + a.pct, 0);
    const supply = TOKENOMICS.allocations.reduce((s, a) => s + a.supply, 0);
    assert.equal(pct, 100);
    assert.equal(supply, TOKENOMICS.totalSupply);
    assert.equal(TOKENOMICS.totalSupply, 1_000_000_000);
  });

  it("tax is 2/2 with a 5% hard cap", () => {
    assert.equal(TOKENOMICS.buyTaxBps, 200);
    assert.equal(TOKENOMICS.sellTaxBps, 200);
    assert.equal(TOKENOMICS.maxTaxBps, 500);
    assert.ok(TOKENOMICS.buyTaxBps <= TOKENOMICS.maxTaxBps);
    assert.equal(clampBps(TOKENOMICS.buyTaxBps, TOKENOMICS.maxTaxBps), 200);
  });

  it("tax shares sum to 10_000 bps", () => {
    assert.equal(taxSharesSum(TOKENOMICS.taxShares), 10_000);
  });
});
