import { describe, it, expect } from "vitest";
import { parseDate, formatDate, addDays, dateRange } from "../src/dates";

describe("parseDate", () => {
  it("parses YYYY-MM-DD to a UTC date", () => {
    const d = parseDate("2024-01-15");
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(15);
  });
});

describe("formatDate", () => {
  it("formats a date to YYYY-MM-DD", () => {
    const d = new Date(Date.UTC(2024, 0, 5));
    expect(formatDate(d)).toBe("2024-01-05");
  });

  it("pads single-digit months and days", () => {
    const d = new Date(Date.UTC(2024, 2, 3));
    expect(formatDate(d)).toBe("2024-03-03");
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2024-01-15", 7)).toBe("2024-01-22");
  });

  it("subtracts days with negative value", () => {
    expect(addDays("2024-01-15", -14)).toBe("2024-01-01");
  });

  it("handles month boundary", () => {
    expect(addDays("2024-01-30", 3)).toBe("2024-02-02");
  });

  it("handles year boundary", () => {
    expect(addDays("2024-12-30", 5)).toBe("2025-01-04");
  });
});

describe("dateRange", () => {
  it("generates inclusive range", () => {
    const range = dateRange("2024-01-01", "2024-01-03");
    expect(range).toEqual(["2024-01-01", "2024-01-02", "2024-01-03"]);
  });

  it("returns single date when start == end", () => {
    expect(dateRange("2024-01-01", "2024-01-01")).toEqual(["2024-01-01"]);
  });

  it("returns empty array when start > end", () => {
    expect(dateRange("2024-01-05", "2024-01-01")).toEqual([]);
  });
});
