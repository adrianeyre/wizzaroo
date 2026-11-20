import { describe, expect, it } from "vitest";
import { formatNumber, roundToThousandths } from "./number-format.js";

describe("formatNumber", () => {
  it("groups thousands, trims decimals and uses a true minus sign", () => {
    expect(formatNumber(2_350_000)).toBe("2,350,000");
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(-7)).toBe("−7");
    expect(roundToThousandths(1.23456)).toBe(1.235);
  });
});
