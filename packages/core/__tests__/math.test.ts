import { describe, it, expect } from "vitest";
import {
  mean,
  stddev,
  computeExpectedTotal,
  computeIncremental,
  computeConfidence,
} from "../src/math";

describe("mean", () => {
  it("returns 0 for empty array", () => {
    expect(mean([])).toBe(0);
  });

  it("returns the single value for a single-element array", () => {
    expect(mean([5])).toBe(5);
  });

  it("computes the correct mean", () => {
    expect(mean([10, 20, 30])).toBe(20);
  });

  it("handles decimals", () => {
    expect(mean([1, 2])).toBe(1.5);
  });
});

describe("stddev", () => {
  it("returns 0 for empty array", () => {
    expect(stddev([])).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(stddev([42])).toBe(0);
  });

  it("returns 0 for constant values", () => {
    expect(stddev([5, 5, 5, 5])).toBe(0);
  });

  it("computes correct population stddev", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] => mean=5, variance=4, stddev=2
    const result = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.0, 5);
  });

  it("computes stddev for simple case", () => {
    // [10, 20] => mean=15, variance=25, stddev=5
    const result = stddev([10, 20]);
    expect(result).toBeCloseTo(5.0, 5);
  });
});

describe("computeExpectedTotal", () => {
  it("multiplies baseline avg by window days", () => {
    expect(computeExpectedTotal(10, 7)).toBe(70);
  });

  it("handles 0 baseline", () => {
    expect(computeExpectedTotal(0, 7)).toBe(0);
  });

  it("handles fractional baseline avg", () => {
    expect(computeExpectedTotal(3.5, 7)).toBeCloseTo(24.5);
  });
});

describe("computeIncremental", () => {
  it("returns positive difference when observed > expected", () => {
    expect(computeIncremental(100, 70)).toBe(30);
  });

  it("returns 0 when observed < expected", () => {
    expect(computeIncremental(50, 70)).toBe(0);
  });

  it("returns 0 when observed == expected", () => {
    expect(computeIncremental(70, 70)).toBe(0);
  });
});

describe("computeConfidence", () => {
  it("returns LOW when no baseline data", () => {
    const result = computeConfidence(100, 5, 7, 0);
    expect(result.confidence).toBe("LOW");
    expect(result.explanation).toContain("No baseline data");
  });

  it("returns LOW when sigma is 0", () => {
    const result = computeConfidence(100, 0, 7, 14);
    expect(result.confidence).toBe("LOW");
    expect(result.explanation).toContain("standard deviation is 0");
  });

  it("returns HIGH when incremental > 2*sigma*sqrt(W)", () => {
    // sigma=5, W=7, sqrt(7)≈2.6458, 2*5*2.6458=26.458
    // incremental=30 > 26.458 => HIGH
    const result = computeConfidence(30, 5, 7, 14);
    expect(result.confidence).toBe("HIGH");
  });

  it("returns MED when incremental between 1 and 2 sigma thresholds", () => {
    // sigma=5, W=7, sqrt(7)≈2.6458
    // 1*5*2.6458=13.229, 2*5*2.6458=26.458
    // incremental=20 is between 13.229 and 26.458 => MED
    const result = computeConfidence(20, 5, 7, 14);
    expect(result.confidence).toBe("MED");
  });

  it("returns LOW when incremental below 1 sigma threshold", () => {
    // sigma=5, W=7, 1*5*sqrt(7)=13.229
    // incremental=10 < 13.229 => LOW
    const result = computeConfidence(10, 5, 7, 14);
    expect(result.confidence).toBe("LOW");
  });

  it("returns LOW when incremental is 0", () => {
    const result = computeConfidence(0, 5, 7, 14);
    expect(result.confidence).toBe("LOW");
  });
});
