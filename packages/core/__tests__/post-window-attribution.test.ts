import { describe, it, expect } from "vitest";
import type { Activity, ActivityReport, DailyMetric, PostWindowAttributionConfig } from "../src/types";
import {
  getClicksForAttribution,
  buildPostWindowDateMap,
  applyProportionalAttribution,
} from "../src/post-window-attribution";

describe("post-window-attribution", () => {
  // Helper to create test activities
  const makeActivity = (
    id: string,
    date: string,
    actualClicks: number | null = null,
    deterministicClicks: number | null = null,
  ): Activity => ({
    id,
    activityType: "newsletter",
    channel: "newsletter",
    partnerName: `Partner ${id}`,
    date,
    status: "live",
    costUsd: 1000,
    deterministicClicks,
    actualClicks,
    deterministicTrackedSignups: null,
    notes: null,
    metadata: { estClicks: deterministicClicks || 100 },
    contentUrl: null,
    channelUrl: null,
  });

  // Helper to create test activity report
  const makeReport = (
    activity: Activity,
    incremental: number,
    incrementalActivations: number = 0,
  ): ActivityReport => ({
    activity,
    baselineWindowStart: "2024-01-01",
    baselineWindowEnd: "2024-01-14",
    baselineAvg: 5,
    baselineStdDev: 2,
    baselineDays: 14,
    postWindowStart: activity.date,
    postWindowEnd: new Date(
      new Date(activity.date).getTime() + 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0], // +1 day for 2-day window
    observedTotal: incremental + 10,
    expectedTotal: 10,
    incremental,
    observedActivations: incrementalActivations + 5,
    expectedActivations: 5,
    incrementalActivations,
    floorSignups: 0,
    confidence: "MED",
    confidenceExplanation: "Test",
    dailyData: [],
  });

  describe("getClicksForAttribution", () => {
    it("prefers actualClicks when available", () => {
      const activity = makeActivity("a1", "2024-01-15", 500, 1000);
      const result = getClicksForAttribution(activity);
      expect(result.clicks).toBe(500);
      expect(result.source).toBe("actual");
    });

    it("falls back to deterministicClicks when actualClicks is null", () => {
      const activity = makeActivity("a1", "2024-01-15", null, 1000);
      const result = getClicksForAttribution(activity);
      expect(result.clicks).toBe(1000);
      expect(result.source).toBe("deterministic");
    });

    it("falls back to metadata.estClicks when both are null", () => {
      const activity = makeActivity("a1", "2024-01-15", null, null);
      const result = getClicksForAttribution(activity);
      expect(result.clicks).toBe(100); // from metadata
      expect(result.source).toBe("estimated");
    });

    it("returns null when no clicks available", () => {
      const activity = {
        ...makeActivity("a1", "2024-01-15", null, null),
        metadata: null,
      };
      const result = getClicksForAttribution(activity);
      expect(result.clicks).toBeNull();
      expect(result.source).toBeNull();
    });
  });

  describe("buildPostWindowDateMap", () => {
    it("builds date map for non-overlapping activities", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      const a2 = makeActivity("a2", "2024-01-17", 300);
      const reports = [
        makeReport(a1, 10),
        makeReport(a2, 5),
      ];

      const dateMap = buildPostWindowDateMap(reports, ["newsletter"]);

      expect(dateMap.get("2024-01-15")).toEqual(["a1"]);
      expect(dateMap.get("2024-01-16")).toEqual(["a1"]); // 2-day window
      expect(dateMap.get("2024-01-17")).toEqual(["a2"]);
      expect(dateMap.get("2024-01-18")).toEqual(["a2"]);
    });

    it("builds date map for overlapping activities", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      const a2 = makeActivity("a2", "2024-01-16", 300);
      const reports = [
        makeReport(a1, 10),
        makeReport(a2, 5),
      ];

      const dateMap = buildPostWindowDateMap(reports, ["newsletter"]);

      expect(dateMap.get("2024-01-15")).toEqual(["a1"]);
      expect(dateMap.get("2024-01-16")).toEqual(["a1", "a2"]); // OVERLAP!
      expect(dateMap.get("2024-01-17")).toEqual(["a2"]);
    });

    it("excludes non-live activities", () => {
      const a1 = { ...makeActivity("a1", "2024-01-15", 500), status: "canceled" };
      const reports = [makeReport(a1, 10)];

      const dateMap = buildPostWindowDateMap(reports, ["newsletter"]);

      expect(dateMap.size).toBe(0);
    });

    it("excludes zero incremental activities", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      const reports = [makeReport(a1, 0)];

      const dateMap = buildPostWindowDateMap(reports, ["newsletter"]);

      expect(dateMap.size).toBe(0);
    });
  });

  describe("applyProportionalAttribution", () => {
    it("does nothing when disabled", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      const reports = [makeReport(a1, 10, 8)];
      const metrics: DailyMetric[] = [];
      const config: PostWindowAttributionConfig = {
        enabled: false,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      expect(result[0].incremental).toBe(10); // unchanged
      expect(result[0].incrementalActivations).toBe(8); // unchanged
      expect(result[0].postWindowAttribution).toBeUndefined();
    });

    it("applies proportional attribution for both signups and activations", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500); // 500 clicks
      const a2 = makeActivity("a2", "2024-01-16", 300); // 300 clicks
      const reports = [
        makeReport(a1, 10, 8),
        makeReport(a2, 10, 8),
      ];

      // Metrics showing signups and activations on each day
      const metrics: DailyMetric[] = [
        { date: "2024-01-15", channel: "newsletter", signups: 5, activations: 3 },
        { date: "2024-01-16", channel: "newsletter", signups: 5, activations: 3 },
        { date: "2024-01-17", channel: "newsletter", signups: 5, activations: 3 },
      ];

      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      // a1: gets 100% of Jan 15, 500/(500+300) of Jan 16
      // signups: 5 + (500/800)*5 = 5 + 3.125 = 8.125
      // activations: 3 + (500/800)*3 = 3 + 1.875 = 4.875
      expect(result[0].incremental).toBeCloseTo(8.125, 2);
      expect(result[0].incrementalActivations).toBeCloseTo(4.875, 2);
      expect(result[0].postWindowAttribution?.rawIncrementalSignups).toBe(10);
      expect(result[0].postWindowAttribution?.rawIncremental).toBe(8);
      expect(result[0].postWindowAttribution?.clicksSource).toBe("actual");

      // a2: gets 300/(500+300) of Jan 16, 100% of Jan 17
      // signups: (300/800)*5 + 5 = 1.875 + 5 = 6.875
      // activations: (300/800)*3 + 3 = 1.125 + 3 = 4.125
      expect(result[1].incremental).toBeCloseTo(6.875, 2);
      expect(result[1].incrementalActivations).toBeCloseTo(4.125, 2);
    });

    it("assigns zero for both signups and activations when no clicks", () => {
      const a1 = makeActivity("a1", "2024-01-15", null, null);
      a1.metadata = null; // No clicks at all
      const reports = [makeReport(a1, 10, 8)];
      const metrics: DailyMetric[] = [
        { date: "2024-01-15", channel: "newsletter", signups: 5, activations: 3 },
      ];
      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      expect(result[0].incremental).toBe(0);
      expect(result[0].incrementalActivations).toBe(0);
      expect(result[0].postWindowAttribution?.clicksUsed).toBeNull();
      expect(result[0].postWindowAttribution?.rawIncrementalSignups).toBe(10);
      expect(result[0].postWindowAttribution?.rawIncremental).toBe(8);
    });

    it("handles single activity correctly", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      const reports = [makeReport(a1, 10, 6)];
      const metrics: DailyMetric[] = [
        { date: "2024-01-15", channel: "newsletter", signups: 5, activations: 3 },
        { date: "2024-01-16", channel: "newsletter", signups: 5, activations: 3 },
      ];
      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      // Single activity gets 100% of both days
      // signups: 5 + 5 = 10
      // activations: 3 + 3 = 6
      expect(result[0].incremental).toBe(10);
      expect(result[0].incrementalActivations).toBe(6);
      expect(result[0].postWindowAttribution?.dailyShares).toHaveLength(2);
      expect(result[0].postWindowAttribution?.dailyShares[0].share).toBe(1.0);
      expect(result[0].postWindowAttribution?.dailyShares[1].share).toBe(1.0);
    });

    it("respects channel filter", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      a1.channel = "youtube"; // Different channel
      const reports = [makeReport(a1, 10, 8)];
      const metrics: DailyMetric[] = [];
      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"], // Only newsletters
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      expect(result[0].incremental).toBe(10); // unchanged
      expect(result[0].incrementalActivations).toBe(8); // unchanged
      expect(result[0].postWindowAttribution).toBeUndefined();
    });
  });
});
