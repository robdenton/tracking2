import type {
  Activity,
  ActivityReport,
  BaselineAdjustment,
  DailyMetric,
  DecontaminatedBaseline,
  DecontaminationConfig,
  UpliftConfig,
} from "./types";
import { addDays, dateRange } from "./dates";
import { mean } from "./math";

/**
 * Calculate daily incremental contribution for an activity.
 * Distributes total incremental lift across post-window days uniformly.
 */
function getDailyIncrementalContribution(
  totalIncremental: number,
  postWindowDays: number,
  postWindowDates: string[],
): Map<string, number> {
  // Simple uniform distribution: incremental / days
  const dailyContribution = totalIncremental / postWindowDays;

  const contributions = new Map<string, number>();
  for (const date of postWindowDates) {
    contributions.set(date, dailyContribution);
  }
  return contributions;
}

/**
 * Get channel-specific post window days (same logic as uplift.ts).
 * Newsletters: 2 days. Podcasts: 5 days. Others: default from config.
 */
function getPostWindowDays(channel: string, defaultDays: number): number {
  if (channel === "newsletter") {
    return 2;
  }
  if (channel === "podcast") {
    return 5;
  }
  return defaultDays;
}

/**
 * Build contamination map: which dates are affected by which activities.
 */
function buildContaminationMap(
  activities: Activity[],
  initialReports: Map<string, ActivityReport>,
  config: UpliftConfig,
): Map<string, Array<{ activityId: string; contribution: number }>> {
  const contaminationMap = new Map<
    string,
    Array<{ activityId: string; contribution: number }>
  >();

  for (const activity of activities) {
    if (activity.status !== "live") continue;

    const report = initialReports.get(activity.id);
    if (!report || report.incremental <= 0) continue;

    const effectivePostDays = getPostWindowDays(
      activity.channel,
      config.postWindowDays,
    );

    const postStart = activity.date;
    const postEnd = addDays(activity.date, effectivePostDays - 1);
    const postDates = dateRange(postStart, postEnd);

    const dailyContributions = getDailyIncrementalContribution(
      report.incremental,
      effectivePostDays,
      postDates,
    );

    for (const [date, contribution] of dailyContributions.entries()) {
      if (!contaminationMap.has(date)) {
        contaminationMap.set(date, []);
      }
      contaminationMap.get(date)!.push({
        activityId: activity.id,
        contribution,
      });
    }
  }

  return contaminationMap;
}

/**
 * Decontaminate baseline signups by subtracting concurrent activity impacts.
 */
function decontaminateBaseline(
  targetActivity: Activity,
  baselineDates: string[],
  baselineSignups: Map<string, number>,
  contaminationMap: Map<
    string,
    Array<{ activityId: string; contribution: number }>
  >,
): DecontaminatedBaseline {
  const cleanedSignups: number[] = [];
  const adjustments: BaselineAdjustment[] = [];

  for (const date of baselineDates) {
    const rawSignups = baselineSignups.get(date) ?? 0;

    // Find contaminations on this date from OTHER activities
    const contaminations = contaminationMap.get(date) || [];
    const relevantContaminations = contaminations.filter(
      (c) => c.activityId !== targetActivity.id,
    );

    // Calculate total contamination to subtract
    let totalContamination = 0;
    for (const contamination of relevantContaminations) {
      totalContamination += contamination.contribution;
    }

    // Cleaned signups = raw - contamination (floor at 0)
    const cleaned = Math.max(0, rawSignups - totalContamination);
    cleanedSignups.push(cleaned);

    if (totalContamination > 0) {
      adjustments.push({
        date,
        rawSignups,
        contamination: totalContamination,
        cleanedSignups: cleaned,
        contaminatingSources: relevantContaminations.map((c) => c.activityId),
      });
    }
  }

  return {
    cleanedSignups,
    adjustments,
    totalAdjustment: adjustments.reduce((sum, a) => sum + a.contamination, 0),
    adjustedDates: adjustments.length,
  };
}

/**
 * Build a lookup map from date string to DailyMetric for O(1) access.
 */
function buildMetricsMap(metrics: DailyMetric[]): Map<string, DailyMetric> {
  const map = new Map<string, DailyMetric>();
  for (const m of metrics) {
    map.set(m.date, m);
  }
  return map;
}

/**
 * Main decontamination algorithm with iteration.
 * Returns a map of activity ID to decontaminated report.
 */
export function decontaminateBaselines(
  activities: Activity[],
  metrics: DailyMetric[],
  config: UpliftConfig,
  computeActivityReportWithCleanedBaseline: (
    activity: Activity,
    cleanedBaselineSignups: number[],
    rawBaselineSignups: number[],
    metrics: DailyMetric[],
    config: UpliftConfig,
    decontaminationInfo: {
      decontaminationIterations: number;
      baselineAdjustments: BaselineAdjustment[];
      totalAdjustment: number;
    },
  ) => ActivityReport,
  computeActivityReport: (
    activity: Activity,
    metrics: DailyMetric[],
    config: UpliftConfig,
  ) => ActivityReport,
): Map<string, ActivityReport> {
  const deconConfig = config.decontamination!;
  const metricsMap = buildMetricsMap(metrics);

  // Pass 0: Calculate initial reports with contaminated baselines
  let currentReports = new Map<string, ActivityReport>();
  for (const activity of activities) {
    const report = computeActivityReport(activity, metrics, config);
    currentReports.set(activity.id, report);
  }

  // Iterative decontamination
  for (
    let iteration = 0;
    iteration < deconConfig.maxIterations;
    iteration++
  ) {
    // Build contamination map from current incremental estimates
    const contaminationMap = buildContaminationMap(
      activities,
      currentReports,
      config,
    );

    // Recalculate each activity with decontaminated baseline
    const nextReports = new Map<string, ActivityReport>();
    let maxDelta = 0; // Track convergence

    for (const activity of activities) {
      // Get baseline window
      const baselineStart = addDays(activity.date, -config.baselineWindowDays);
      const baselineEnd = addDays(activity.date, -1);
      const baselineDates = dateRange(baselineStart, baselineEnd);

      // Collect raw baseline signups
      const baselineSignupsMap = new Map<string, number>();
      const rawBaselineSignups: number[] = [];
      for (const date of baselineDates) {
        const m = metricsMap.get(date);
        if (m) {
          baselineSignupsMap.set(date, m.signups);
          rawBaselineSignups.push(m.signups);
        }
      }

      // Decontaminate baseline
      const decontaminated = decontaminateBaseline(
        activity,
        baselineDates,
        baselineSignupsMap,
        contaminationMap,
      );

      // Recalculate report with cleaned baseline
      const report = computeActivityReportWithCleanedBaseline(
        activity,
        decontaminated.cleanedSignups,
        rawBaselineSignups,
        metrics,
        config,
        {
          decontaminationIterations: iteration + 1,
          baselineAdjustments: decontaminated.adjustments,
          totalAdjustment: decontaminated.totalAdjustment,
        },
      );

      nextReports.set(activity.id, report);

      // Track convergence
      const oldIncremental = currentReports.get(activity.id)?.incremental ?? 0;
      const newIncremental = report.incremental;
      const delta = Math.abs(newIncremental - oldIncremental);
      maxDelta = Math.max(maxDelta, delta);
    }

    currentReports = nextReports;

    // Check convergence
    if (maxDelta < deconConfig.convergenceThreshold) {
      console.log(
        `Decontamination converged after ${iteration + 1} iterations (max delta: ${maxDelta.toFixed(2)})`,
      );
      break;
    }
  }

  return currentReports;
}
