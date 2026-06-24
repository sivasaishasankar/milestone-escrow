import { describe, expect, it } from "vitest";
import { nativeToScVal } from "@stellar/stellar-sdk";

/**
 * Regression test for a real bug: create_escrow trapped on-chain
 * (HostError(WasmVm, InvalidAction) / UnreachableCodeReached) because
 * nativeToScVal(bigint[]) with no type hint encodes each element as "the
 * smallest XDR type that fits the value" (u32 for amounts like 10_000_000),
 * not i128 -- which doesn't match the contract's `Vec<i128>` parameter.
 * Confirmed against testnet RPC simulateTransaction before/after the fix;
 * this test locks in the encoding itself so it can't silently regress.
 */
describe("milestone amount ScVal encoding", () => {
  it("encodes each element of a bigint[] as i128 when { type: 'i128' } is passed", () => {
    const amounts = [10_000_000n, 20_000_000n];
    const scVal = nativeToScVal(amounts, { type: "i128" });
    const vec = scVal.vec();
    expect(vec).toHaveLength(2);
    for (const el of vec!) {
      expect(el.switch().name).toBe("scvI128");
    }
  });

  it("regression guard: omitting the type hint does NOT produce i128 (the original bug)", () => {
    const amounts = [10_000_000n, 20_000_000n];
    const scVal = nativeToScVal(amounts);
    const vec = scVal.vec();
    // This intentionally documents the buggy behavior so the difference from
    // the fixed call above is explicit, not assumed.
    expect(vec![0].switch().name).not.toBe("scvI128");
  });
});
