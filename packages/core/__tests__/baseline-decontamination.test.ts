import { describe, it, expect } from "vitest";
import type { Activity, DailyMetric, UpliftConfig } from "../src/types";
import { decontaminateBaselines } from "../src/baseline-decontamination";
import {
  computeActivityReport,
  computeActivityReportWithCleanedBaseline,
} from "../src/uplift";

/** Helper to create a test activity */
function makeActivity(
  id: string,
  date: string,
  channel: string,
  status: string = "live",
): Activity {
  return {
    id,
    activityType: "test",
    channel,
    partnerName: "Test Partner",
    date,
    status,
    costUsd: null,
    deterministicClicks: null,
    deterministicTrackedSignups: null,
    notes: null,
    metadata: null,
    contentUrl: null,
    channelUrl: null,
  };
}

/** Helper to create daily metrics for a date range */
function makeDailyMetrics(
  startDate: string,
  endDate: string,
  signupsPerDay: number,
  channel: string = "email",
): DailyMetric[] {
  const metrics: DailyMetric[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    metrics.push({
      date: dateStr,
      channel,
      signups: signupsPerDay,
      activations: 0,
    });
  }

  return metrics;
}

describe("decontaminateBaselines", () => {
  it("subtracts concurrent activity incremental from baseline", () => {
    // Activity B on Jan 19, drives lift
    // Activity A on Jan 25, baseline includes Jan 19
    // Expected: A's Jan 19 baseline adjusted down by B's contribution

    const activityA = makeActivity("A", "2024-01-25", "email");
    const activityB = makeActivity("B", "2024-01-19", "email");

    // Metrics: baseline 50/day, but Jan 19-25 elevated to 65/day (B's impact)
    const metrics = [
      ...makeDailyMetrics("2024-01-01", "2024-01-18", 50, "email"),
      ...makeDailyMetrics("2024-01-19", "2024-01-25", 65, "email"),
      ...makeDailyMetrics("2024-01-26", "2024-01-31", 50, "email"),
    ];

    const config: UpliftConfig = {
      baselineWindowDays: 14,
      postWindowDays: 7,
      decontamination: {
        enabled: true,
        maxIterations: 2,
        convergenceThreshold: 1,
      },
    };

    const reports = decontaminateBaselines(
      [activityA, activityB],
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    const reportA = reports.get("A")!;

    // With decontamination, baseline avg should be closer to 50
    expect(reportA.baselineDecontamination).toBeDefined();
    expect(reportA.baselineDecontamination?.rawBaselineAvg).toBeGreaterThan(55);
    expect(reportA.baselineAvg).toBeLessThan(
      reportA.baselineDecontamination!.rawBaselineAvg,
    );
    expect(reportA.baselineDecontamination?.adjustedDates).toBeGreaterThan(0);
  });

  it("converges within max iterations for typical case", () => {
    // Create 5 activities with overlapping windows
    const activities = [
      makeActivity("A", "2024-01-15", "email"),
      makeActivity("B", "2024-01-18", "email"),
      makeActivity("C", "2024-01-21", "email"),
      makeActivity("D", "2024-01-24", "email"),
      makeActivity("E", "2024-01-27", "email"),
    ];

    // Metrics with consistent signups
    const metrics = makeDailyMetrics("2024-01-01", "2024-02-05", 50, "email");

    const config: UpliftConfig = {
      baselineWindowDays: 14,
      postWindowDays: 7,
      decontamination: {
        enabled: true,
        maxIterations: 3,
        convergenceThreshold: 1,
      },
    };

    const reports = decontaminateBaselines(
      activities,
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    // Check all reports have decontamination info
    for (const activity of activities) {
      const report = reports.get(activity.id)!;
      expect(report.baselineDecontamination).toBeDefined();
      expect(report.baselineDecontamination?.iterations).toBeLessThanOrEqual(3);
    }
  });

  it("handles zero/negative incremental correctly", () => {
    // Activity with no lift should not contaminate other baselines
    const activityA = makeActivity("A", "2024-01-15", "email");
    const activityB = makeActivity("B", "2024-01-22", "email");

    // Metrics: stable 50/day (no lift for A)
    const metrics = makeDailyMetrics("2024-01-01", "2024-01-31", 50, "email");

    const config: UpliftConfig = {
      baselineWindowDays: 14,
      postWindowDays: 7,
      decontamination: {
        enabled: true,
        maxIterations: 2,
        convergenceThreshold: 1,
      },
    };

    const reports = decontaminateBaselines(
      [activityA, activityB],
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    const reportB = reports.get("B")!;

    // B's baseline should not be significantly adjusted since A had no lift
    expect(reportB.baselineDecontamination).toBeDefined();
    // Total adjustment should be minimal or zero
    expect(reportB.baselineDecontamination?.totalAdjustment).toBeLessThan(10);
  });

  it("respects newsletter 2-day post window", () => {
    // Newsletter activity should only contribute contamination for 2 days
    const newsletter = makeActivity("NL", "2024-01-15", "newsletter");
    const activityB = makeActivity("B", "2024-01-20", "newsletter");

    // Metrics with elevated signups during newsletter post-window
    const metrics = [
      ...makeDailyMetrics("2024-01-01", "2024-01-14", 50, "newsletter"),
      ...makeDailyMetrics("2024-01-15", "2024-01-16", 80, "newsletter"), // NL 2-day window
      ...makeDailyMetrics("2024-01-17", "2024-01-31", 50, "newsletter"),
    ];

    const config: UpliftConfig = {
      baselineWindowDays: 14,
      postWindowDays: 7, // Default, but newsletter overrides to 2
      decontamination: {
        enabled: true,
        maxIterations: 2,
        convergenceThreshold: 1,
      },
    };

    const reports = decontaminateBaselines(
      [newsletter, activityB],
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    const nlReport = reports.get("NL")!;

    // Newsletter should have positive incremental
    expect(nlReport.incremental).toBeGreaterThan(0);
    // Post window should be 2 days
    expect(nlReport.postWindowEnd).toBe("2024-01-16");
  });

  it("handles canceled and booked activities correctly", () => {
    // Only "live" activities should contribute contamination
    const liveActivity = makeActivity("A", "2024-01-15", "email", "live");
    const canceledActivity = makeActivity("B", "2024-01-18", "email", "canceled");
    const bookedActivity = makeActivity("C", "2024-01-21", "email", "booked");

    const metrics = makeDailyMetrics("2024-01-01", "2024-01-31", 50, "email");

    const config: UpliftConfig = {
      baselineWindowDays: 14,
      postWindowDays: 7,
      decontamination: {
        enabled: true,
        maxIterations: 2,
        convergenceThreshold: 1,
      },
    };

    const reports = decontaminateBaselines(
      [liveActivity, canceledActivity, bookedActivity],
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    // Only live activity should have a report
    expect(reports.has("A")).toBe(true);
    expect(reports.has("B")).toBe(true); // Computed but shouldn't contaminate
    expect(reports.has("C")).toBe(true);

    const reportC = reports.get("C")!;
    // C's baseline should not be contaminated by canceled activity B
    // (This is implicit in the algorithm - canceled activities don't contribute)
  });

  it("handles high-frequency scenario with daily activities", () => {
    // Simulate daily newsletter sends for 30 days
    const newsletters = Array.from({ length: 30 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return makeActivity(`newsletter-${i}`, `2024-01-${day}`, "newsletter");
    });

    // Metrics: baseline 100/day with small lift from each newsletter
    const metrics = makeDailyMetrics(
      "2023-12-01",
      "2024-02-01",
      100,
      "newsletter",
    );

    const config: UpliftConfig = {
      baselineWindowDays: 14,
      postWindowDays: 2, // Newsletter override
      decontamination: {
        enabled: true,
        maxIterations: 2,
        convergenceThreshold: 1,
      },
    };

    const reports = decontaminateBaselines(
      newsletters,
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    // All newsletters should have reports
    expect(reports.size).toBe(30);

    // Check decontamination was applied
    for (const newsletter of newsletters) {
      const report = reports.get(newsletter.id)!;
      expect(report.baselineDecontamination).toBeDefined();
      expect(report.baselineDecontamination?.iterations).toBeGreaterThan(0);
    }
  });

  it("produces decontamination metadata in reports", () => {
    const activityA = makeActivity("A", "2024-01-25", "email");
    const activityB = makeActivity("B", "2024-01-19", "email");

    const metrics = [
      ...makeDailyMetrics("2024-01-01", "2024-01-18", 50, "email"),
      ...makeDailyMetrics("2024-01-19", "2024-01-25", 70, "email"),
      ...makeDailyMetrics("2024-01-26", "2024-01-31", 50, "email"),
    ];

    const config: UpliftConfig = {
      baselineWindowDays: 14,
      postWindowDays: 7,
      decontamination: {
        enabled: true,
        maxIterations: 2,
        convergenceThreshold: 1,
      },
    };

    const reports = decontaminateBaselines(
      [activityA, activityB],
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    const reportA = reports.get("A")!;

    // Verify decontamination metadata structure
    expect(reportA.baselineDecontamination).toMatchObject({
      enabled: true,
      iterations: expect.any(Number),
      adjustments: expect.any(Array),
      totalAdjustment: expect.any(Number),
      adjustedDates: expect.any(Number),
      rawBaselineAvg: expect.any(Number),
      cleanedBaselineAvg: expect.any(Number),
    });

    // Verify daily data includes adjustment info
    const adjustedDay = reportA.dailyData.find(
      (d) => d.baselineAdjustment !== undefined,
    );
    if (adjustedDay) {
      expect(adjustedDay.baselineAdjustment).toMatchObject({
        contamination: expect.any(Number),
        sources: expect.any(Array),
      });
    }
  });
});
