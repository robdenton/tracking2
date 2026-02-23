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
  // postWindowStart = activity.date, postWindowEnd = date + 1 (2-day window)
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
      .split("T")[0], // +1 day → 2-day window
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
    const metrics: DailyMetric[] = []; // Not used in new algorithm

    it("does nothing when disabled", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      const reports = [makeReport(a1, 10, 8)];
      const config: PostWindowAttributionConfig = {
        enabled: false,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      expect(result[0].incremental).toBe(10); // unchanged
      expect(result[0].incrementalActivations).toBe(8); // unchanged
      expect(result[0].postWindowAttribution).toBeUndefined();
    });

    it("single activity with no overlap gets its own incremental back unchanged", () => {
      // a1 has a 2-day window. No other activities overlap.
      // dateMap will have entries for both days, but only a1 is in them.
      // The pool on each day = a1's daily incremental (10/2=5 signups, 6/2=3 activations)
      // a1 gets 100% → total = 5+5=10 signups, 3+3=6 activations
      const a1 = makeActivity("a1", "2024-01-15", 500);
      const reports = [makeReport(a1, 10, 6)];
      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      expect(result[0].incremental).toBeCloseTo(10, 5);
      expect(result[0].incrementalActivations).toBeCloseTo(6, 5);
      expect(result[0].postWindowAttribution?.rawIncrementalSignups).toBe(10);
      expect(result[0].postWindowAttribution?.rawIncremental).toBe(6);
    });

    it("two overlapping activities split by click share on overlap days", () => {
      // a1: date=Jan15, window=Jan15–Jan16, incremental=10 signups, 8 activations, 500 clicks
      // a2: date=Jan16, window=Jan16–Jan17, incremental=10 signups, 8 activations, 300 clicks
      //
      // Jan15: only a1 → pool=5 signups,4 activations; a1 gets 100% → 5 signups, 4 activations
      // Jan16: a1+a2 overlap → pool=(5+5)=10 signups,(4+4)=8 activations
      //   a1 share = 500/(500+300) = 0.625 → 6.25 signups, 5.0 activations
      //   a2 share = 300/(500+300) = 0.375 → 3.75 signups, 3.0 activations
      // Jan17: only a2 → pool=5 signups,4 activations; a2 gets 100% → 5 signups, 4 activations
      //
      // a1 total: 5 + 6.25 = 11.25 signups, 4 + 5.0 = 9.0 activations  (raw was 10/8)
      // a2 total: 3.75 + 5 = 8.75 signups, 3.0 + 4 = 7.0 activations  (raw was 10/8)
      //
      // Note: a1's attributed (11.25) slightly exceeds its raw (10) because when pools overlap,
      // pooling both activities' incremental means attribution can give slightly more than raw.
      // The Math.min cap in the newsletter page protects against this.

      const a1 = makeActivity("a1", "2024-01-15", 500);
      const a2 = makeActivity("a2", "2024-01-16", 300);
      const reports = [
        makeReport(a1, 10, 8),
        makeReport(a2, 10, 8),
      ];
      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      // a1: Jan15 (5 sig, 4 act) + Jan16 share (6.25 sig, 5 act) = 11.25 sig, 9 act
      expect(result[0].incremental).toBeCloseTo(11.25, 2);
      expect(result[0].incrementalActivations).toBeCloseTo(9.0, 2);
      expect(result[0].postWindowAttribution?.rawIncrementalSignups).toBe(10);
      expect(result[0].postWindowAttribution?.clicksSource).toBe("actual");

      // a2: Jan16 share (3.75 sig, 3 act) + Jan17 (5 sig, 4 act) = 8.75 sig, 7 act
      expect(result[1].incremental).toBeCloseTo(8.75, 2);
      expect(result[1].incrementalActivations).toBeCloseTo(7.0, 2);
    });

    it("assigns zero for both signups and activations when no clicks", () => {
      const a1 = makeActivity("a1", "2024-01-15", null, null);
      a1.metadata = null; // No clicks at all
      const reports = [makeReport(a1, 10, 8)];
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

    it("respects channel filter", () => {
      const a1 = makeActivity("a1", "2024-01-15", 500);
      a1.channel = "youtube"; // Different channel
      const reports = [makeReport(a1, 10, 8)];
      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"], // Only newsletters
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      expect(result[0].incremental).toBe(10); // unchanged
      expect(result[0].incrementalActivations).toBe(8); // unchanged
      expect(result[0].postWindowAttribution).toBeUndefined();
    });

    it("pool conservation: sum of attributed ≤ sum of raw when no overlap", () => {
      // Without overlap, each activity gets exactly its own incremental back
      const a1 = makeActivity("a1", "2024-01-10", 500);
      const a2 = makeActivity("a2", "2024-01-15", 300);
      const reports = [makeReport(a1, 20, 10), makeReport(a2, 15, 8)];
      const config: PostWindowAttributionConfig = {
        enabled: true,
        channels: ["newsletter"],
      };

      const result = applyProportionalAttribution(reports, metrics, config);

      expect(result[0].incremental).toBeCloseTo(20, 5);
      expect(result[1].incremental).toBeCloseTo(15, 5);
    });
  });
});
