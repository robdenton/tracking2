import type {
  Activity,
  ActivityReport,
  BaselineAdjustment,
  DailyMetric,
  DayDataPoint,
  UpliftConfig,
  DailyAttributionShare,
} from "./types";
import { addDays, dateRange } from "./dates";
import {
  mean,
  median,
  stddev,
  computeExpectedTotal,
  computeIncremental,
  computeConfidence,
} from "./math";
import { getClicksForAttribution } from "./post-window-attribution";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildMetricsMap(metrics: DailyMetric[]): Map<string, DailyMetric> {
  const map = new Map<string, DailyMetric>();
  for (const m of metrics) {
    map.set(m.date, m);
  }
  return map;
}

/**
 * Get channel-specific post window days.
 * Newsletters: 2 days. Podcasts: 5 days. Others: config default.
 */
export function getPostWindowDays(channel: string, defaultDays: number): number {
  if (channel === "newsletter") return 2;
  if (channel === "podcast") return 5;
  return defaultDays;
}

/** All post-window dates for a single live activity. */
function getActivityPostWindowDates(
  activity: Activity,
  config: UpliftConfig,
): string[] {
  if (activity.status !== "live") return [];
  const pwDays = getPostWindowDays(activity.channel, config.postWindowDays);
  return dateRange(activity.date, addDays(activity.date, pwDays - 1));
}

/**
 * The union of all post-window dates across all live activities.
 * These dates are "contaminated" — elevated by campaign activity —
 * and are excluded from serving as clean baseline days.
 */
function buildGlobalPostWindowSet(
  activities: Activity[],
  config: UpliftConfig,
): Set<string> {
  const set = new Set<string>();
  for (const activity of activities) {
    for (const d of getActivityPostWindowDates(activity, config)) {
      set.add(d);
    }
  }
  return set;
}

interface DailyBaseline {
  activationsAvg: number;
  signupsAvg: number;
  signupsSigma: number; // std dev of signups on clean days (for confidence scoring)
  cleanDays: string[];  // most-recent-first list of clean days used
}

// How far back (calendar days) we'll search for clean baseline days.
const BASELINE_LOOKBACK_MAX = 60;

// ---------------------------------------------------------------------------
// Core: single channel-level daily baseline
// ---------------------------------------------------------------------------

/**
 * For every post-window date D, compute the channel-level daily baseline:
 * the average activations/signups on the N most-recent "clean" days before D,
 * where "clean" = that day is not in ANY activity's post-window.
 *
 * This replaces the old per-activity 14-day pre-window baseline and the
 * downstream decontamination loop. Because all overlapping activities share
 * the same baseline[D], their attributed incremental figures always sum to
 * the portfolio total, which is bounded by the observed daily channel NAU.
 */
function computeChannelDailyBaselines(
  activities: Activity[],
  metrics: DailyMetric[],
  config: UpliftConfig,
): Map<string, DailyBaseline> {
  const metricsMap = buildMetricsMap(metrics);
  const postWindowDateSet = buildGlobalPostWindowSet(activities, config);
  const target = config.baselineWindowDays; // typically 14

  // Collect every post-window date that needs a baseline.
  const datesToBaseline = new Set<string>();
  for (const activity of activities) {
    for (const d of getActivityPostWindowDates(activity, config)) {
      datesToBaseline.add(d);
    }
  }

  const result = new Map<string, DailyBaseline>();

  for (const date of datesToBaseline) {
    const cleanDays: string[] = [];
    let cursor = addDays(date, -1);
    let lookback = 0;

    while (cleanDays.length < target && lookback < BASELINE_LOOKBACK_MAX) {
      if (!postWindowDateSet.has(cursor) && metricsMap.has(cursor)) {
        cleanDays.push(cursor);
      }
      cursor = addDays(cursor, -1);
      lookback++;
    }

    if (cleanDays.length === 0) {
      result.set(date, { activationsAvg: 0, signupsAvg: 0, signupsSigma: 0, cleanDays: [] });
      continue;
    }

    const actVals = cleanDays.map(d => metricsMap.get(d)!.activations);
    const sigVals = cleanDays.map(d => metricsMap.get(d)!.signups);

    // Use median (not mean) to make baselines robust to outlier high days.
    // The mean is skewed by extreme values (e.g. Jan 6: 41 activations, 96 signups)
    // which inflates the baseline above observed NAU on many newsletter days.
    // Since newsletters can only ADD to NAU (never reduce it), observed < baseline
    // implies the organic level was lower than the mean suggests. Median gives a
    // more representative "typical" organic level for pool computation.
    result.set(date, {
      activationsAvg: median(actVals),
      signupsAvg: median(sigVals),
      signupsSigma: stddev(sigVals),
      cleanDays,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main export: computeAllReports — new channel-baseline model
// ---------------------------------------------------------------------------

/**
 * Compute uplift reports for all activities using the single-channel daily
 * baseline model.
 *
 * For each post-window day D shared by one or more active newsletters:
 *   pool[D]  = max(0, observed[D] − channel_baseline[D])
 *   share[A] = A.clicks / Σ clicks of all activities active on D
 *   A gets   = pool[D] × share[A]
 *
 * Properties of this model:
 * - All activities sharing day D use the same baseline → no inconsistency.
 * - Σ all attributed figures = Σ pool[D] ≤ actual daily channel NAU.
 * - Per-activity figures sum exactly to the portfolio total.
 * - No separate period-level Math.min cap is needed in the chart layer.
 */
export function computeAllReports(
  activities: Activity[],
  metrics: DailyMetric[],
  config: UpliftConfig,
): ActivityReport[] {
  const metricsMap = buildMetricsMap(metrics);

  // Step 1: Channel-level daily baselines for every post-window date.
  const baselines = computeChannelDailyBaselines(activities, metrics, config);

  // Step 2: Daily pool per date.
  const poolActivations = new Map<string, number>();
  const poolSignups    = new Map<string, number>();
  for (const [date, b] of baselines) {
    const m = metricsMap.get(date);
    poolActivations.set(date, m ? Math.max(0, m.activations - b.activationsAvg) : 0);
    poolSignups.set(date,     m ? Math.max(0, m.signups    - b.signupsAvg)    : 0);
  }

  // Step 3: date → [activityId] for overlapping-activity lookup.
  const dateToActivityIds = new Map<string, string[]>();
  for (const activity of activities) {
    if (activity.status !== "live") continue;
    for (const d of getActivityPostWindowDates(activity, config)) {
      const ids = dateToActivityIds.get(d) ?? [];
      ids.push(activity.id);
      dateToActivityIds.set(d, ids);
    }
  }

  // Pre-compute clicks per activity.
  const clicksMap = new Map<string, { clicks: number | null; source: "actual" | "deterministic" | "estimated" | null }>();
  for (const activity of activities) {
    clicksMap.set(activity.id, getClicksForAttribution(activity));
  }

  // Step 4: Build one ActivityReport per activity.
  return activities.map((activity): ActivityReport => {
    const pwDays    = getPostWindowDays(activity.channel, config.postWindowDays);
    const postStart = activity.date;
    const postEnd   = addDays(activity.date, pwDays - 1);
    const postDates = dateRange(postStart, postEnd);
    const postDateSet = new Set(postDates);

    // Standard 14-day display window (for the detail-page chart).
    const displayBaselineEnd   = addDays(activity.date, -1);
    const displayBaselineStart = addDays(activity.date, -config.baselineWindowDays);
    const displayBaselineDates = dateRange(displayBaselineStart, displayBaselineEnd);

    // Observed totals across the post-window.
    let observedTotal = 0, observedActivations = 0;
    for (const d of postDates) {
      const m = metricsMap.get(d);
      if (m) { observedTotal += m.signups; observedActivations += m.activations; }
    }

    // Non-live activities: return a zero-incremental shell using a simple baseline
    // derived from the standard 14-day pre-window (no attribution needed).
    if (activity.status !== "live") {
      const bSig: number[] = [], bAct: number[] = [];
      for (const d of displayBaselineDates) {
        const m = metricsMap.get(d);
        if (m) { bSig.push(m.signups); bAct.push(m.activations); }
      }
      const bAvg = mean(bSig), bSigma = stddev(bSig), bActAvg = mean(bAct);
      const dailyData: DayDataPoint[] = [...displayBaselineDates, ...postDates].map(d => ({
        date: d, signups: metricsMap.get(d)?.signups ?? 0,
        isBaseline: !postDateSet.has(d), isPostWindow: postDateSet.has(d),
      }));
      return {
        activity,
        baselineWindowStart: displayBaselineStart, baselineWindowEnd: displayBaselineEnd,
        baselineAvg: bAvg, baselineStdDev: bSigma, baselineDays: bSig.length,
        postWindowStart: postStart, postWindowEnd: postEnd,
        observedTotal, expectedTotal: bAvg * pwDays, incremental: 0,
        observedActivations, expectedActivations: bActAvg * pwDays, incrementalActivations: 0,
        floorSignups: activity.deterministicTrackedSignups ?? 0,
        confidence: "LOW", confidenceExplanation: "Activity is not live.",
        dailyData,
      };
    }

    // Live activity: attribute from the daily pool.
    const { clicks, source } = clicksMap.get(activity.id)!;
    const dailyShares: DailyAttributionShare[] = [];
    let totalAttribSignups = 0, totalAttribActivations = 0;
    let rawWindowActivations = 0, rawWindowSignups = 0;

    for (const d of postDates) {
      const pa = poolActivations.get(d) ?? 0;
      const ps = poolSignups.get(d) ?? 0;
      rawWindowActivations += pa;
      rawWindowSignups     += ps;

      const overlappingIds = dateToActivityIds.get(d) ?? [];

      // Total clicks among all activities active on this day.
      let totalClicks = 0;
      for (const actId of overlappingIds) {
        const { clicks: c } = clicksMap.get(actId) ?? { clicks: null };
        if (c != null && c > 0) totalClicks += c;
      }

      const myClicks = clicks ?? 0;
      let share: number;
      if (overlappingIds.length === 0) {
        share = 0;
      } else if (totalClicks === 0) {
        // No one has click data — equal share.
        share = 1 / overlappingIds.length;
      } else if (myClicks === 0) {
        // Others have clicks; this activity has none — gets nothing.
        share = 0;
      } else {
        share = myClicks / totalClicks;
      }

      const attribAct = pa * share;
      const attribSig = ps * share;
      totalAttribActivations += attribAct;
      totalAttribSignups     += attribSig;

      dailyShares.push({
        date: d,
        pooledIncremental: pa,
        pooledSignups: ps,
        myClicks,
        totalClicks: totalClicks > 0 ? totalClicks : overlappingIds.length,
        share,
        attributed: attribAct,
        attributedSignups: attribSig,
        overlappingActivities: overlappingIds,
      });
    }

    // Baseline stats: use the first post-window day's clean-day baseline as
    // representative for the whole activity (they are usually identical for a
    // 2-day newsletter window).
    const refBaseline = baselines.get(postDates[0]);
    const baselineDaysCount  = refBaseline?.cleanDays.length ?? 0;
    const effBaselineStart   = refBaseline?.cleanDays.at(-1) ?? displayBaselineStart;
    const effBaselineEnd     = refBaseline?.cleanDays[0]    ?? displayBaselineEnd;
    const bAvgSignups        = refBaseline?.signupsAvg      ?? 0;
    const bAvgActivations    = refBaseline?.activationsAvg  ?? 0;
    const bSigmaSignups      = refBaseline?.signupsSigma    ?? 0;

    const { confidence, explanation } = computeConfidence(
      totalAttribSignups,
      bSigmaSignups,
      pwDays,
      baselineDaysCount,
    );

    // Daily data: show standard 14-day pre-window + post-window for the detail chart.
    const dailyData: DayDataPoint[] = [...displayBaselineDates, ...postDates].map(d => ({
      date: d,
      signups: metricsMap.get(d)?.signups ?? 0,
      isBaseline: !postDateSet.has(d),
      isPostWindow: postDateSet.has(d),
    }));

    return {
      activity,
      baselineWindowStart: effBaselineStart,
      baselineWindowEnd:   effBaselineEnd,
      baselineAvg:         bAvgSignups,
      baselineStdDev:      bSigmaSignups,
      baselineDays:        baselineDaysCount,
      postWindowStart:     postStart,
      postWindowEnd:       postEnd,
      observedTotal,
      expectedTotal:       bAvgSignups * pwDays,
      incremental:         totalAttribSignups,
      observedActivations,
      expectedActivations: bAvgActivations * pwDays,
      incrementalActivations: totalAttribActivations,
      floorSignups:        activity.deterministicTrackedSignups ?? 0,
      confidence,
      confidenceExplanation: explanation,
      dailyData,
      postWindowAttribution: {
        enabled: true,
        rawIncrementalSignups:         rawWindowSignups,
        attributedIncrementalSignups:  totalAttribSignups,
        rawIncremental:                rawWindowActivations,
        attributedIncremental:         totalAttribActivations,
        dailyShares,
        clicksUsed:   clicks,
        clicksSource: source,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Legacy single-activity functions — kept for getReportById() fallback in
// data.ts. These use the old per-activity baseline model. Prefer loading
// from activity_uplifts or running computeAllReports() where possible.
// ---------------------------------------------------------------------------

/**
 * @legacy Compute the uplift report for a single activity in isolation.
 * Does not apply channel-level daily baseline or click-share attribution.
 * Use computeAllReports() for canonical figures.
 */
export function computeActivityReport(
  activity: Activity,
  metrics: DailyMetric[],
  config: UpliftConfig,
): ActivityReport {
  const metricsMap = buildMetricsMap(metrics);
  const { baselineWindowDays, postWindowDays: defaultPostWindowDays } = config;
  const postWindowDays_ = getPostWindowDays(activity.channel, defaultPostWindowDays);

  const baselineStart = addDays(activity.date, -baselineWindowDays);
  const baselineEnd   = addDays(activity.date, -1);
  const baselineDates = dateRange(baselineStart, baselineEnd);
  const postStart     = activity.date;
  const postEnd       = addDays(activity.date, postWindowDays_ - 1);
  const postDates     = dateRange(postStart, postEnd);
  const postDateSet   = new Set(postDates);

  const baselineSignups: number[] = [], baselineActivations: number[] = [];
  for (const d of baselineDates) {
    const m = metricsMap.get(d);
    if (m) { baselineSignups.push(m.signups); baselineActivations.push(m.activations); }
  }

  let observedTotal = 0, observedActivations = 0;
  for (const d of postDates) {
    const m = metricsMap.get(d);
    if (m) { observedTotal += m.signups; observedActivations += m.activations; }
  }

  const baselineAvg       = mean(baselineSignups);
  const baselineSigma     = stddev(baselineSignups);
  const expectedTotal     = computeExpectedTotal(baselineAvg, postWindowDays_);
  const incremental       = computeIncremental(observedTotal, expectedTotal);
  const bActAvg           = mean(baselineActivations);
  const expectedAct       = computeExpectedTotal(bActAvg, postWindowDays_);
  const incrementalAct    = computeIncremental(observedActivations, expectedAct);
  const { confidence, explanation } = computeConfidence(incremental, baselineSigma, postWindowDays_, baselineSignups.length);

  const dailyData: DayDataPoint[] = [...baselineDates, ...postDates].map(d => ({
    date: d, signups: metricsMap.get(d)?.signups ?? 0,
    isBaseline: !postDateSet.has(d), isPostWindow: postDateSet.has(d),
  }));

  return {
    activity,
    baselineWindowStart: baselineStart, baselineWindowEnd: baselineEnd,
    baselineAvg, baselineStdDev: baselineSigma, baselineDays: baselineSignups.length,
    postWindowStart: postStart, postWindowEnd: postEnd,
    observedTotal, expectedTotal, incremental,
    observedActivations, expectedActivations: expectedAct, incrementalActivations: incrementalAct,
    floorSignups: activity.deterministicTrackedSignups ?? 0,
    confidence, confidenceExplanation: explanation,
    dailyData,
  };
}

/**
 * @legacy Compute activity report using pre-cleaned baseline signups.
 * Used by the old decontamination algorithm.
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
  const postWindowDays_ = getPostWindowDays(activity.channel, config.postWindowDays);

  const baselineAvg   = mean(cleanedBaselineSignups);
  const baselineSigma = stddev(cleanedBaselineSignups);
  const baselineStart = addDays(activity.date, -config.baselineWindowDays);
  const baselineEnd   = addDays(activity.date, -1);
  const baselineDates = dateRange(baselineStart, baselineEnd);
  const postStart     = activity.date;
  const postEnd       = addDays(activity.date, postWindowDays_ - 1);
  const postDates     = dateRange(postStart, postEnd);
  const postDateSet   = new Set(postDates);

  let observedTotal = 0, observedActivations = 0;
  for (const d of postDates) {
    const m = metricsMap.get(d);
    if (m) { observedTotal += m.signups; observedActivations += m.activations; }
  }

  const expectedTotal  = computeExpectedTotal(baselineAvg, postWindowDays_);
  const incremental    = computeIncremental(observedTotal, expectedTotal);
  const bActVals: number[] = [];
  for (const d of baselineDates) { const m = metricsMap.get(d); if (m) bActVals.push(m.activations); }
  const bActAvg     = mean(bActVals);
  const expectedAct = computeExpectedTotal(bActAvg, postWindowDays_);
  const incrementalAct = computeIncremental(observedActivations, expectedAct);
  const { confidence, explanation } = computeConfidence(incremental, baselineSigma, postWindowDays_, cleanedBaselineSignups.length);

  const adjustmentMap = new Map<string, BaselineAdjustment>();
  for (const adj of decontaminationInfo.baselineAdjustments) adjustmentMap.set(adj.date, adj);

  const dailyData: DayDataPoint[] = [...baselineDates, ...postDates].map(d => {
    const m = metricsMap.get(d);
    const adj = adjustmentMap.get(d);
    return {
      date: d, signups: m?.signups ?? 0,
      isBaseline: !postDateSet.has(d), isPostWindow: postDateSet.has(d),
      baselineAdjustment: adj ? { contamination: adj.contamination, sources: adj.contaminatingSources } : undefined,
    };
  });

  return {
    activity,
    baselineWindowStart: baselineStart, baselineWindowEnd: baselineEnd,
    baselineAvg, baselineStdDev: baselineSigma, baselineDays: cleanedBaselineSignups.length,
    postWindowStart: postStart, postWindowEnd: postEnd,
    observedTotal, expectedTotal, incremental,
    observedActivations, expectedActivations: expectedAct, incrementalActivations: incrementalAct,
    floorSignups: activity.deterministicTrackedSignups ?? 0,
    confidence, confidenceExplanation: explanation,
    dailyData,
    baselineDecontamination: {
      enabled: true,
      iterations: decontaminationInfo.decontaminationIterations,
      adjustments: decontaminationInfo.baselineAdjustments,
      totalAdjustment: decontaminationInfo.totalAdjustment,
      adjustedDates: decontaminationInfo.baselineAdjustments.length,
      rawBaselineAvg: mean(rawBaselineSignups),
      cleanedBaselineAvg: baselineAvg,
    },
  };
}
