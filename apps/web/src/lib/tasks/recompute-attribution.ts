/**
 * Attribution Recompute Task
 *
 * Runs the full uplift pipeline (per-channel baseline decontamination +
 * proportional click-share attribution) and persists the results to the
 * `activity_uplifts` table.
 *
 * Called automatically after every Google Sheets sync so that all surfaces
 * (app pages, ad-hoc queries, CEO reports) read the same pre-computed values.
 * Can also be triggered manually via POST /api/recompute.
 */

import { prisma } from "../prisma";
import { computeAllReports, getConfig } from "@mai/core";
import type { Activity, DailyMetric } from "@mai/core";
import { toActivity, toDailyMetric } from "../mappers";

export interface RecomputeResult {
  count: number;
  durationMs: number;
}

export async function recomputeAttribution(): Promise<RecomputeResult> {
  const startedAt = Date.now();

  // Fetch all source data
  const [activityRows, metricRows] = await Promise.all([
    prisma.activity.findMany({ orderBy: { date: "asc" } }),
    prisma.dailyMetric.findMany({ orderBy: { date: "asc" } }),
  ]);

  const activities = activityRows.map(toActivity);
  const allMetrics = metricRows.map(toDailyMetric);
  const config = getConfig();

  // Group by channel for per-channel decontamination
  const metricsByChannel = new Map<string, DailyMetric[]>();
  const activitiesByChannel = new Map<string, Activity[]>();

  for (const metric of allMetrics) {
    if (!metricsByChannel.has(metric.channel)) {
      metricsByChannel.set(metric.channel, []);
    }
    metricsByChannel.get(metric.channel)!.push(metric);
  }

  for (const activity of activities) {
    if (!activitiesByChannel.has(activity.channel)) {
      activitiesByChannel.set(activity.channel, []);
    }
    activitiesByChannel.get(activity.channel)!.push(activity);
  }

  // Compute reports per channel. computeAllReports() uses the single channel-level
  // daily baseline model and returns fully attributed figures inline — no separate
  // applyProportionalAttribution() step is needed.
  const allReports = [];
  // Upper-bound reports (7-day post-window) for newsletter, keyed by activity ID
  const upperBoundMap = new Map<string, { signups: number; activations: number; activationsAll: number }>();

  for (const [channel, channelActivities] of activitiesByChannel) {
    const channelMetrics = metricsByChannel.get(channel) ?? [];
    const channelReports = computeAllReports(channelActivities, channelMetrics, config);
    allReports.push(...channelReports);

    // For newsletter: also compute 7-day upper-bound estimates
    if (channel === "newsletter") {
      const upperReports = computeAllReports(channelActivities, channelMetrics, config, 7);
      for (const ur of upperReports) {
        const attr = ur.postWindowAttribution;
        upperBoundMap.set(ur.activity.id, {
          signups: attr?.attributedIncrementalSignups ?? ur.incremental,
          activations: attr?.attributedIncremental ?? ur.incrementalActivations,
          activationsAll: ur.incrementalActivationsAllDevices,
        });
      }
    }
  }

  // Delete existing uplift records and write fresh ones.
  // Note: because the sync pipeline does a full delete+reinsert of activities,
  // old ActivityUplift rows are cascade-deleted automatically. The deleteMany
  // here is a safety net for cases where recompute runs without a prior sync.
  await prisma.activityUplift.deleteMany();

  await prisma.activityUplift.createMany({
    data: allReports.map((report) => {
      const attr = report.postWindowAttribution;

      // Raw values = what was measured before click-share splitting
      const rawIncrementalSignups =
        attr?.rawIncrementalSignups ?? report.incremental;
      const rawIncrementalActivations =
        attr?.rawIncremental ?? report.incrementalActivations;

      // Attributed values = canonical figures after click-share splitting.
      // computeAllReports() returns attributed values inline in postWindowAttribution.
      const attributedIncrementalSignups =
        attr?.attributedIncrementalSignups ?? report.incremental;
      const attributedIncrementalActivations =
        attr?.attributedIncremental ?? report.incrementalActivations;

      const ub = upperBoundMap.get(report.activity.id);

      return {
        activityId: report.activity.id,
        baselineWindowStart: report.baselineWindowStart,
        baselineWindowEnd: report.baselineWindowEnd,
        baselineAvg: report.baselineAvg,
        rawIncrementalSignups,
        rawIncrementalActivations,
        attributedIncrementalSignups,
        attributedIncrementalActivations,
        attributedIncrActAllDevices: report.incrementalActivationsAllDevices,
        upperBoundIncrSignups: ub?.signups ?? 0,
        upperBoundIncrActivations: ub?.activations ?? 0,
        upperBoundIncrActAllDevices: ub?.activationsAll ?? 0,
        clicksUsed: attr?.clicksUsed ?? null,
        clicksSource: attr?.clicksSource ?? null,
        confidence: report.confidence,
        confidenceExplanation: report.confidenceExplanation,
        dailySharesJson: attr?.dailyShares
          ? JSON.stringify(attr.dailyShares)
          : null,
        dailyDataJson: report.dailyData
          ? JSON.stringify(report.dailyData)
          : null,
      };
    }),
  });

  return {
    count: allReports.length,
    durationMs: Date.now() - startedAt,
  };
}
