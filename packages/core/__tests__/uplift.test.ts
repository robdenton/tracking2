import { describe, it, expect } from "vitest";
import { computeActivityReport } from "../src/uplift";
import type { Activity, DailyMetric, UpliftConfig } from "../src/types";

function makeMetrics(
  startDate: string,
  signupsPerDay: number[],
): DailyMetric[] {
  const metrics: DailyMetric[] = [];
  const [y, m, d] = startDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));

  for (let i = 0; i < signupsPerDay.length; i++) {
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + i);
    const ds = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    metrics.push({
      date: ds,
      channel: "email",
      signups: signupsPerDay[i],
      activations: 0,
    });
  }
  return metrics;
}

const defaultConfig: UpliftConfig = {
  baselineWindowDays: 14,
  postWindowDays: 7,
};

const baseActivity: Activity = {
  id: "test-1",
  activityType: "campaign",
  channel: "email",
  partnerName: "TestPartner",
  date: "2024-01-15",
  status: "live",
  costUsd: null,
  deterministicClicks: null,
  deterministicTrackedSignups: null,
  notes: null,
  metadata: null,
};

describe("computeActivityReport", () => {
  it("computes correct report with constant baseline and spike", () => {
    // 14 days baseline (Jan 1-14) at 10 signups/day
    // 7 days post (Jan 15-21) at 20 signups/day
    const signups = [
      ...Array(14).fill(10), // baseline: 10/day
      ...Array(7).fill(20), // post: 20/day
    ];
    const metrics = makeMetrics("2024-01-01", signups);

    const report = computeActivityReport(baseActivity, metrics, defaultConfig);

    expect(report.baselineAvg).toBe(10);
    expect(report.baselineStdDev).toBe(0);
    expect(report.expectedTotal).toBe(70); // 10 * 7
    expect(report.observedTotal).toBe(140); // 20 * 7
    expect(report.incremental).toBe(70); // 140 - 70
    expect(report.floorSignups).toBe(0);
    // sigma=0 so confidence=LOW
    expect(report.confidence).toBe("LOW");
  });

  it("clamps incremental to 0 when observed < expected", () => {
    // baseline: 20/day, post: 10/day => negative incremental clamped to 0
    const signups = [
      ...Array(14).fill(20),
      ...Array(7).fill(10),
    ];
    const metrics = makeMetrics("2024-01-01", signups);

    const report = computeActivityReport(baseActivity, metrics, defaultConfig);

    expect(report.incremental).toBe(0);
  });

  it("uses deterministic_tracked_signups as floor", () => {
    const activity: Activity = {
      ...baseActivity,
      deterministicTrackedSignups: 25,
    };
    const signups = [
      ...Array(14).fill(10),
      ...Array(7).fill(10),
    ];
    const metrics = makeMetrics("2024-01-01", signups);

    const report = computeActivityReport(activity, metrics, defaultConfig);

    expect(report.floorSignups).toBe(25);
    expect(report.incremental).toBe(0); // no uplift
  });

  it("handles missing baseline data gracefully", () => {
    // Only post-window data exists
    const metrics = makeMetrics("2024-01-15", Array(7).fill(15));

    const report = computeActivityReport(baseActivity, metrics, defaultConfig);

    expect(report.baselineAvg).toBe(0);
    expect(report.baselineDays).toBe(0);
    expect(report.expectedTotal).toBe(0);
    expect(report.observedTotal).toBe(105); // 15 * 7
    expect(report.incremental).toBe(105);
    expect(report.confidence).toBe("LOW");
    expect(report.confidenceExplanation).toContain("No baseline data");
  });

  it("computes HIGH confidence correctly", () => {
    // Need non-zero sigma. Baseline oscillates: 10,20,10,20...
    // mean=15, variance = ((10-15)^2 + (20-15)^2)/2 = 25, sigma=5
    // expected = 15*7 = 105
    // Need incremental > 2*5*sqrt(7) ≈ 26.458
    // So observed needs to be > 105+27 = 132, let's use 20/day => 140 total
    const baseline = Array(14)
      .fill(0)
      .map((_, i) => (i % 2 === 0 ? 10 : 20));
    const post = Array(7).fill(20);
    const metrics = makeMetrics("2024-01-01", [...baseline, ...post]);

    const report = computeActivityReport(baseActivity, metrics, defaultConfig);

    expect(report.baselineAvg).toBe(15);
    expect(report.baselineStdDev).toBeCloseTo(5, 4);
    expect(report.observedTotal).toBe(140);
    expect(report.expectedTotal).toBe(105);
    expect(report.incremental).toBe(35);
    // 35 > 2*5*sqrt(7) ≈ 26.458 => HIGH
    expect(report.confidence).toBe("HIGH");
  });

  it("includes correct daily data points", () => {
    const signups = [
      ...Array(14).fill(10),
      ...Array(7).fill(20),
    ];
    const metrics = makeMetrics("2024-01-01", signups);

    const report = computeActivityReport(baseActivity, metrics, defaultConfig);

    expect(report.dailyData).toHaveLength(21); // 14 baseline + 7 post
    expect(report.dailyData[0].isBaseline).toBe(true);
    expect(report.dailyData[0].isPostWindow).toBe(false);
    expect(report.dailyData[13].isBaseline).toBe(true);
    expect(report.dailyData[14].isBaseline).toBe(false);
    expect(report.dailyData[14].isPostWindow).toBe(true);
  });

  it("respects custom config windows", () => {
    const config: UpliftConfig = {
      baselineWindowDays: 7,
      postWindowDays: 3,
    };
    const signups = [
      ...Array(7).fill(10), // baseline
      ...Array(3).fill(30), // post
    ];
    // Activity date = Jan 8, so baseline = Jan 1-7, post = Jan 8-10
    const activity: Activity = { ...baseActivity, date: "2024-01-08" };
    const metrics = makeMetrics("2024-01-01", signups);

    const report = computeActivityReport(activity, metrics, config);

    expect(report.baselineAvg).toBe(10);
    expect(report.expectedTotal).toBe(30); // 10 * 3
    expect(report.observedTotal).toBe(90); // 30 * 3
    expect(report.incremental).toBe(60);
    expect(report.dailyData).toHaveLength(10); // 7 + 3
  });
});
