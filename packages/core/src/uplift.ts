import type {
  Activity,
  ActivityReport,
  BaselineAdjustment,
  DailyMetric,
  DayDataPoint,
  UpliftConfig,
} from "./types";
import { addDays, dateRange } from "./dates";
import {
  mean,
  stddev,
  computeExpectedTotal,
  computeIncremental,
  computeConfidence,
} from "./math";
import { decontaminateBaselines } from "./baseline-decontamination";

/**
 * Build a lookup map from date string to DailyMetric for O(1) access.
 */
function buildMetricsMap(
  metrics: DailyMetric[],
): Map<string, DailyMetric> {
  const map = new Map<string, DailyMetric>();
  for (const m of metrics) {
    map.set(m.date, m);
  }
  return map;
}

/**
 * Get channel-specific post window days.
 * Newsletters use a 2-day window (day of send + 1 day after).
 * Podcasts use a 5-day window.
 * Other channels use the default from config.
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
 * Compute the uplift report for a single activity given all daily metrics.
 */
export function computeActivityReport(
  activity: Activity,
  metrics: DailyMetric[],
  config: UpliftConfig,
): ActivityReport {
  const metricsMap = buildMetricsMap(metrics);
  const { baselineWindowDays, postWindowDays: defaultPostWindowDays } = config;

  // Use channel-specific post window days
  const postWindowDays = getPostWindowDays(activity.channel, defaultPostWindowDays);

  // Baseline window: [t - B, t - 1]
  const baselineStart = addDays(activity.date, -baselineWindowDays);
  const baselineEnd = addDays(activity.date, -1);
  const baselineDates = dateRange(baselineStart, baselineEnd);

  // Post window: [t, t + W - 1]
  const postStart = activity.date;
  const postEnd = addDays(activity.date, postWindowDays - 1);
  const postDates = dateRange(postStart, postEnd);

  // Gather baseline signups and activations (only days that have data)
  const baselineSignups: number[] = [];
  const baselineActivations: number[] = [];
  for (const d of baselineDates) {
    const m = metricsMap.get(d);
    if (m !== undefined) {
      baselineSignups.push(m.signups);
      baselineActivations.push(m.activations);
    }
  }

  // Gather post-window signups and activations
  let observedTotal = 0;
  let observedActivations = 0;
  for (const d of postDates) {
    const m = metricsMap.get(d);
    if (m !== undefined) {
      observedTotal += m.signups;
      observedActivations += m.activations;
    }
  }

  const baselineAvg = mean(baselineSignups);
  const baselineSigma = stddev(baselineSignups);
  const expectedTotal = computeExpectedTotal(baselineAvg, postWindowDays);
  const incremental = computeIncremental(observedTotal, expectedTotal);

  const baselineActivationsAvg = mean(baselineActivations);
  const expectedActivations = computeExpectedTotal(baselineActivationsAvg, postWindowDays);
  const incrementalActivations = computeIncremental(observedActivations, expectedActivations);

  const floorSignups = activity.deterministicTrackedSignups ?? 0;

  const { confidence, explanation } = computeConfidence(
    incremental,
    baselineSigma,
    postWindowDays,
    baselineSignups.length,
  );

  // Build daily data points for the detail view
  const dailyData: DayDataPoint[] = [];
  const baselineDateSet = new Set(baselineDates);
  const postDateSet = new Set(postDates);

  // Combine all dates in order
  const allDates = [...baselineDates, ...postDates];
  for (const d of allDates) {
    const m = metricsMap.get(d);
    dailyData.push({
      date: d,
      signups: m?.signups ?? 0,
      isBaseline: baselineDateSet.has(d),
      isPostWindow: postDateSet.has(d),
    });
  }

  return {
    activity,
    baselineWindowStart: baselineStart,
    baselineWindowEnd: baselineEnd,
    baselineAvg,
    baselineStdDev: baselineSigma,
    baselineDays: baselineSignups.length,
    postWindowStart: postStart,
    postWindowEnd: postEnd,
    observedTotal,
    expectedTotal,
    incremental,
    observedActivations,
    expectedActivations,
    incrementalActivations,
    floorSignups,
    confidence,
    confidenceExplanation: explanation,
    dailyData,
  };
}

/**
 * Compute activity report using pre-cleaned baseline signups.
 * Used by decontamination algorithm.
 */
export function computeActivityReportWithCleanedBaseline(
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
): ActivityReport {
  const metricsMap = buildMetricsMap(metrics);
  const { postWindowDays: defaultPostWindowDays } = config;

  // Use channel-specific post window days
  const postWindowDays = getPostWindowDays(
    activity.channel,
    defaultPostWindowDays,
  );

  // Calculate statistics from cleaned baseline
  const baselineAvg = mean(cleanedBaselineSignups);
  const baselineSigma = stddev(cleanedBaselineSignups);

  // Baseline window dates
  const baselineStart = addDays(activity.date, -config.baselineWindowDays);
  const baselineEnd = addDays(activity.date, -1);
  const baselineDates = dateRange(baselineStart, baselineEnd);

  // Post-window calculation
  const postStart = activity.date;
  const postEnd = addDays(activity.date, postWindowDays - 1);
  const postDates = dateRange(postStart, postEnd);

  let observedTotal = 0;
  let observedActivations = 0;
  for (const d of postDates) {
    const m = metricsMap.get(d);
    if (m) {
      observedTotal += m.signups;
      observedActivations += m.activations;
    }
  }

  const expectedTotal = computeExpectedTotal(baselineAvg, postWindowDays);
  const incremental = computeIncremental(observedTotal, expectedTotal);

  // Calculate baseline activations from the same baseline window
  const baselineActivations: number[] = [];
  for (const d of baselineDates) {
    const m = metricsMap.get(d);
    if (m) baselineActivations.push(m.activations);
  }
  const baselineActivationsAvg = mean(baselineActivations);
  const expectedActivations = computeExpectedTotal(baselineActivationsAvg, postWindowDays);
  const incrementalActivations = computeIncremental(observedActivations, expectedActivations);

  const floorSignups = activity.deterministicTrackedSignups ?? 0;

  const { confidence, explanation } = computeConfidence(
    incremental,
    baselineSigma,
    postWindowDays,
    cleanedBaselineSignups.length,
  );

  // Build daily data with adjustment info
  const adjustmentMap = new Map<string, BaselineAdjustment>();
  for (const adj of decontaminationInfo.baselineAdjustments) {
    adjustmentMap.set(adj.date, adj);
  }

  const dailyData: DayDataPoint[] = [];
  const baselineDateSet = new Set(baselineDates);
  const postDateSet = new Set(postDates);

  for (const d of [...baselineDates, ...postDates]) {
    const m = metricsMap.get(d);
    const adjustment = adjustmentMap.get(d);

    dailyData.push({
      date: d,
      signups: m?.signups ?? 0,
      isBaseline: baselineDateSet.has(d),
      isPostWindow: postDateSet.has(d),
      baselineAdjustment: adjustment
        ? {
            contamination: adjustment.contamination,
            sources: adjustment.contaminatingSources,
          }
        : undefined,
    });
  }

  // Calculate raw baseline avg for comparison
  const rawBaselineAvg = mean(rawBaselineSignups);

  return {
    activity,
    baselineWindowStart: baselineStart,
    baselineWindowEnd: baselineEnd,
    baselineAvg,
    baselineStdDev: baselineSigma,
    baselineDays: cleanedBaselineSignups.length,
    postWindowStart: postStart,
    postWindowEnd: postEnd,
    observedTotal,
    expectedTotal,
    incremental,
    observedActivations,
    expectedActivations,
    incrementalActivations,
    floorSignups,
    confidence,
    confidenceExplanation: explanation,
    dailyData,
    baselineDecontamination: {
      enabled: true,
      iterations: decontaminationInfo.decontaminationIterations,
      adjustments: decontaminationInfo.baselineAdjustments,
      totalAdjustment: decontaminationInfo.totalAdjustment,
      adjustedDates: decontaminationInfo.baselineAdjustments.length,
      rawBaselineAvg,
      cleanedBaselineAvg: baselineAvg,
    },
  };
}

/**
 * Compute reports for all activities.
 */
export function computeAllReports(
  activities: Activity[],
  metrics: DailyMetric[],
  config: UpliftConfig,
): ActivityReport[] {
  let reports: ActivityReport[];

  // Phase 1: Baseline decontamination (if enabled)
  if (config.decontamination?.enabled) {
    const reportsMap = decontaminateBaselines(
      activities,
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    // Convert map to array maintaining original order
    reports = activities.map((a) => reportsMap.get(a.id)!);
  } else {
    // Otherwise, use original algorithm
    reports = activities.map((a) => computeActivityReport(a, metrics, config));
  }

  // Phase 2: Post-window proportional attribution (if enabled)
  // Note: This needs to be imported dynamically to avoid circular dependency
  // We'll apply it in the web layer instead
  return reports;
}
