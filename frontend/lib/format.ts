const STROOPS_PER_XLM = 10_000_000n;

/** Format a stroop amount (i128 native precision) as a human XLM string. */
export function formatXlm(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_XLM;
  const frac = stroops % STROOPS_PER_XLM;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(7, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export function xlmToStroops(xlm: string): bigint {
  const [wholeStr, fracStr = ""] = xlm.trim().split(".");
  const whole = BigInt(wholeStr || "0");
  const fracPadded = (fracStr + "0000000").slice(0, 7);
  return whole * STROOPS_PER_XLM + BigInt(fracPadded || "0");
}

export function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}
