/**
 * Pure address / tax helpers used by the client config.
 * Keep this file free of React and wagmi so unit tests stay cheap.
 */

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function isHexAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && HEX_ADDRESS.test(value);
}

export function isZeroAddress(value: unknown): boolean {
  return typeof value === "string" && value.toLowerCase() === ZERO_ADDRESS;
}

/** True when env supplies a real (non-zero, well-formed) contract address. */
export function isConfiguredAddress(value: unknown): boolean {
  return isHexAddress(value) && !isZeroAddress(value);
}

export function clampBps(value: number, max = 500): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

export function taxSharesSum(shares: {
  treasury: number;
  liquidity: number;
  burn: number;
}): number {
  return shares.treasury + shares.liquidity + shares.burn;
}
