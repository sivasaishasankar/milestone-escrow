import { describe, expect, it } from "vitest";
import { formatXlm, xlmToStroops, shortAddress } from "./format";

describe("formatXlm", () => {
  it("formats whole XLM amounts with no trailing decimal", () => {
    expect(formatXlm(10_000_000n)).toBe("1");
    expect(formatXlm(30_000_000n)).toBe("3");
  });

  it("formats fractional amounts and trims trailing zeros", () => {
    expect(formatXlm(15_000_000n)).toBe("1.5");
    expect(formatXlm(10_000_001n)).toBe("1.0000001");
  });

  it("formats zero", () => {
    expect(formatXlm(0n)).toBe("0");
  });
});

describe("xlmToStroops", () => {
  it("converts whole XLM strings to stroops", () => {
    expect(xlmToStroops("1")).toBe(10_000_000n);
    expect(xlmToStroops("3")).toBe(30_000_000n);
  });

  it("converts fractional XLM strings to stroops", () => {
    expect(xlmToStroops("1.5")).toBe(15_000_000n);
    expect(xlmToStroops("0.0000001")).toBe(1n);
  });

  it("round-trips through formatXlm", () => {
    for (const stroops of [0n, 10_000_000n, 15_000_000n, 12_345_678n]) {
      expect(xlmToStroops(formatXlm(stroops))).toBe(stroops);
    }
  });

  it("treats an empty string as zero", () => {
    expect(xlmToStroops("")).toBe(0n);
  });
});

describe("shortAddress", () => {
  it("truncates long addresses to head...tail", () => {
    expect(shortAddress("GDMWBEQEGVRA5TWLWZSP42M3XS76ZMMYRCEKR3TBT7WIPWUOZZL7B57I")).toBe(
      "GDMWBE…L7B57I",
    );
  });

  it("leaves short strings unchanged", () => {
    expect(shortAddress("short")).toBe("short");
  });
});
