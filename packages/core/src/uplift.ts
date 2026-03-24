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
import { getAttributionWeight } from "./post-window-attribution";

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
 * Newsletters: 2 days. LinkedIn: 3 days. Podcasts: 5 days. Others: config default.
 */
export function getPostWindowDays(channel: string, defaultDays: number): number {
  if (channel === "newsletter") return 2;
  if (channel === "linkedin") return 3;
  if (channel === "podcast") return 5;
  return defaultDays;
}

/** All post-window dates for a single live activity. */
function getActivityPostWindowDates(
  activity: Activity,
  config: UpliftConfig,
  postWindowOverride?: number,
): string[] {
  if (activity.status !== "live") return [];
  const pwDays = postWindowOverride ?? getPostWindowDays(activity.channel, config.postWindowDays);
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
  postWindowOverride?: number,
): Set<string> {
  const set = new Set<string>();
  for (const activity of activities) {
    for (const d of getActivityPostWindowDates(activity, config, postWindowOverride)) {
      set.add(d);
    }
  }
  return set;
}

interface DailyBaseline {
  activationsAvg: number;
  activationsAllDevicesAvg: number;
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
 * For every post-window date D, compute the channel-level daily baseline.
 *
 * Two modes:
 *
 * 1. **Fixed baseline** (configured via `config.fixedBaselines[channel]`):
 *    Uses a fixed historical period (e.g. Nov 1 – Dec 6 2025) as the baseline.
 *    Every post-window date gets the same baseline values — the median of
 *    activations/signups across all days in the fixed period. This avoids the
 *    stale-baseline problem when activities run densely with no clean days.
 *
 * 2. **Rolling baseline** (default):
 *    For each post-window date D, find the N most-recent "clean" days before D
 *    (where "clean" = not in ANY activity's post-window) and take the median.
 *
 * Because all overlapping activities share the same baseline[D], their
 * attributed incremental figures always sum to the portfolio total, which
 * is bounded by the observed daily channel NAU.
 */
function computeChannelDailyBaselines(
  activities: Activity[],
  metrics: DailyMetric[],
  config: UpliftConfig,
  postWindowOverride?: number,
): Map<string, DailyBaseline> {
  const metricsMap = buildMetricsMap(metrics);

  // Check if this channel has a fixed baseline configured.
  const channel = activities[0]?.channel;
  const fixedConfig = channel ? config.fixedBaselines?.[channel] : undefined;

  if (fixedConfig) {
    return computeFixedBaseline(activities, metricsMap, config, fixedConfig, postWindowOverride);
  }

  // --- Rolling baseline (existing logic) ---
  const postWindowDateSet = buildGlobalPostWindowSet(activities, config, postWindowOverride);
  const target = config.baselineWindowDays; // typically 14

  // Collect every post-window date that needs a baseline.
  const datesToBaseline = new Set<string>();
  for (const activity of activities) {
    for (const d of getActivityPostWindowDates(activity, config, postWindowOverride)) {
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
      result.set(date, { activationsAvg: 0, activationsAllDevicesAvg: 0, signupsAvg: 0, signupsSigma: 0, cleanDays: [] });
      continue;
    }

    const actVals = cleanDays.map(d => metricsMap.get(d)!.activations);
    const actAllVals = cleanDays.map(d => metricsMap.get(d)!.activationsAllDevices);
    const sigVals = cleanDays.map(d => metricsMap.get(d)!.signups);

    // Use median (not mean) to make baselines robust to outlier high days.
    result.set(date, {
      activationsAvg: median(actVals),
      activationsAllDevicesAvg: median(actAllVals),
      signupsAvg: median(sigVals),
      signupsSigma: stddev(sigVals),
      cleanDays,
    });
  }

  return result;
}

/**
 * Compute weekday/weekend split baselines from a fixed historical period
 * and assign the appropriate one to each post-window date.
 *
 * Days without metric data in the fixed period are treated as zeros
 * (missing row = no survey-attributed signups/activations that day).
 */
function computeFixedBaseline(
  activities: Activity[],
  metricsMap: Map<string, DailyMetric>,
  config: UpliftConfig,
  fixedConfig: { startDate: string; endDate: string },
  postWindowOverride?: number,
): Map<string, DailyBaseline> {
  // Generate every calendar day in the fixed period (including zeros for missing data)
  const fixedDates = dateRange(fixedConfig.startDate, fixedConfig.endDate);

  const wdAct: number[] = [], wdActAll: number[] = [], wdSig: number[] = [];
  const weAct: number[] = [], weActAll: number[] = [], weSig: number[] = [];
  const cleanDays: string[] = [];

  for (const d of fixedDates) {
    const m = metricsMap.get(d);
    const act = m?.activations ?? 0;
    const actAll = m?.activationsAllDevices ?? 0;
    const sig = m?.signups ?? 0;
    cleanDays.push(d);

    const dow = new Date(d + "T00:00:00Z").getUTCDay();
    if (dow >= 1 && dow <= 5) {
      wdAct.push(act); wdActAll.push(actAll); wdSig.push(sig);
    } else {
      weAct.push(act); weActAll.push(actAll); weSig.push(sig);
    }
  }

  // Weekday baseline
  const wdBaseline: DailyBaseline = {
    activationsAvg: wdAct.length > 0 ? median(wdAct) : 0,
    activationsAllDevicesAvg: wdActAll.length > 0 ? median(wdActAll) : 0,
    signupsAvg: wdSig.length > 0 ? median(wdSig) : 0,
    signupsSigma: wdSig.length > 0 ? stddev(wdSig) : 0,
    cleanDays,
  };

  // Weekend baseline
  const weBaseline: DailyBaseline = {
    activationsAvg: weAct.length > 0 ? median(weAct) : 0,
    activationsAllDevicesAvg: weActAll.length > 0 ? median(weActAll) : 0,
    signupsAvg: weSig.length > 0 ? median(weSig) : 0,
    signupsSigma: weSig.length > 0 ? stddev(weSig) : 0,
    cleanDays,
  };

  // Assign weekday or weekend baseline to each post-window date.
  const result = new Map<string, DailyBaseline>();
  for (const activity of activities) {
    for (const d of getActivityPostWindowDates(activity, config, postWindowOverride)) {
      const dow = new Date(d + "T00:00:00Z").getUTCDay();
      result.set(d, dow >= 1 && dow <= 5 ? wdBaseline : weBaseline);
    }
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
  postWindowOverride?: number,
): ActivityReport[] {
  const metricsMap = buildMetricsMap(metrics);

  // Step 1: Channel-level daily baselines for every post-window date.
  const baselines = computeChannelDailyBaselines(activities, metrics, config, postWindowOverride);

  // Step 2: Daily pool per date.
  const poolActivations = new Map<string, number>();
  const poolActivationsAll = new Map<string, number>();
  const poolSignups    = new Map<string, number>();
  for (const [date, b] of baselines) {
    const m = metricsMap.get(date);
    poolActivations.set(date, m ? Math.max(0, m.activations - b.activationsAvg) : 0);
    poolActivationsAll.set(date, m ? Math.max(0, m.activationsAllDevices - b.activationsAllDevicesAvg) : 0);
    poolSignups.set(date,     m ? Math.max(0, m.signups    - b.signupsAvg)    : 0);
  }

  // Step 3: date → [activityId] for overlapping-activity lookup.
  const dateToActivityIds = new Map<string, string[]>();
  for (const activity of activities) {
    if (activity.status !== "live") continue;
    for (const d of getActivityPostWindowDates(activity, config, postWindowOverride)) {
      const ids = dateToActivityIds.get(d) ?? [];
      ids.push(activity.id);
      dateToActivityIds.set(d, ids);
    }
  }

  // Pre-compute attribution weights per activity (clicks for newsletters, impressions for LinkedIn).
  const weightsMap = new Map<string, { weight: number | null; source: "actual" | "deterministic" | "reported" | "estimated" | null }>();
  for (const activity of activities) {
    weightsMap.set(activity.id, getAttributionWeight(activity));
  }

  // Step 4: Build one ActivityReport per activity.
  return activities.map((activity): ActivityReport => {
    const pwDays    = postWindowOverride ?? getPostWindowDays(activity.channel, config.postWindowDays);
    const postStart = activity.date;
    const postEnd   = addDays(activity.date, pwDays - 1);
    const postDates = dateRange(postStart, postEnd);
    const postDateSet = new Set(postDates);

    // Standard 14-day display window (for the detail-page chart).
    const displayBaselineEnd   = addDays(activity.date, -1);
    const displayBaselineStart = addDays(activity.date, -config.baselineWindowDays);
    const displayBaselineDates = dateRange(displayBaselineStart, displayBaselineEnd);

    // Observed totals across the post-window.
    let observedTotal = 0, observedActivations = 0, observedActivationsAll = 0;
    for (const d of postDates) {
      const m = metricsMap.get(d);
      if (m) { observedTotal += m.signups; observedActivations += m.activations; observedActivationsAll += m.activationsAllDevices; }
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
        date: d, signups: metricsMap.get(d)?.signups ?? 0, activations: metricsMap.get(d)?.activations ?? 0,
        isBaseline: !postDateSet.has(d), isPostWindow: postDateSet.has(d),
      }));
      return {
        activity,
        baselineWindowStart: displayBaselineStart, baselineWindowEnd: displayBaselineEnd,
        baselineAvg: bAvg, baselineStdDev: bSigma, baselineDays: bSig.length,
        postWindowStart: postStart, postWindowEnd: postEnd,
        observedTotal, expectedTotal: bAvg * pwDays, incremental: 0,
        observedActivations, expectedActivations: bActAvg * pwDays, incrementalActivations: 0,
        observedActivationsAllDevices: observedActivationsAll, expectedActivationsAllDevices: 0, incrementalActivationsAllDevices: 0,
        floorSignups: activity.deterministicTrackedSignups ?? 0,
        confidence: "LOW", confidenceExplanation: "Activity is not live.",
        dailyData,
      };
    }

    // Live activity: attribute from the daily pool.
    const { weight: myWeight, source } = weightsMap.get(activity.id)!;
    const dailyShares: DailyAttributionShare[] = [];
    let totalAttribSignups = 0, totalAttribActivations = 0, totalAttribActivationsAll = 0;
    let rawWindowActivations = 0, rawWindowSignups = 0, rawWindowActivationsAll = 0;

    for (const d of postDates) {
      const pa = poolActivations.get(d) ?? 0;
      const paAll = poolActivationsAll.get(d) ?? 0;
      const ps = poolSignups.get(d) ?? 0;
      rawWindowActivations += pa;
      rawWindowActivationsAll += paAll;
      rawWindowSignups     += ps;

      const overlappingIds = dateToActivityIds.get(d) ?? [];

      // Total attribution weight among all activities active on this day
      // (clicks for newsletters, impressions for LinkedIn, etc.).
      let totalWeight = 0;
      for (const actId of overlappingIds) {
        const { weight: w } = weightsMap.get(actId) ?? { weight: null };
        if (w != null && w > 0) totalWeight += w;
      }

      const myW = myWeight ?? 0;
      let share: number;
      if (overlappingIds.length === 0) {
        share = 0;
      } else if (totalWeight === 0) {
        // No one has weight data — equal share.
        share = 1 / overlappingIds.length;
      } else if (myW === 0) {
        // Others have weight data; this activity has none — gets nothing.
        share = 0;
      } else {
        share = myW / totalWeight;
      }

      const attribAct = pa * share;
      const attribActAll = paAll * share;
      const attribSig = ps * share;
      totalAttribActivations += attribAct;
      totalAttribActivationsAll += attribActAll;
      totalAttribSignups     += attribSig;

      dailyShares.push({
        date: d,
        pooledIncremental: pa,
        pooledSignups: ps,
        myClicks: myW,
        totalClicks: totalWeight > 0 ? totalWeight : overlappingIds.length,
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
      activations: metricsMap.get(d)?.activations ?? 0,
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
      observedActivationsAllDevices: observedActivationsAll,
      expectedActivationsAllDevices: (refBaseline?.activationsAllDevicesAvg ?? 0) * pwDays,
      incrementalActivationsAllDevices: totalAttribActivationsAll,
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
        clicksUsed:   myWeight,
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
    date: d, signups: metricsMap.get(d)?.signups ?? 0, activations: metricsMap.get(d)?.activations ?? 0,
    isBaseline: !postDateSet.has(d), isPostWindow: postDateSet.has(d),
  }));

  return {
    activity,
    baselineWindowStart: baselineStart, baselineWindowEnd: baselineEnd,
    baselineAvg, baselineStdDev: baselineSigma, baselineDays: baselineSignups.length,
    postWindowStart: postStart, postWindowEnd: postEnd,
    observedTotal, expectedTotal, incremental,
    observedActivations, expectedActivations: expectedAct, incrementalActivations: incrementalAct,
    observedActivationsAllDevices: 0, expectedActivationsAllDevices: 0, incrementalActivationsAllDevices: 0,
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
      date: d, signups: m?.signups ?? 0, activations: m?.activations ?? 0,
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
    observedActivationsAllDevices: 0, expectedActivationsAllDevices: 0, incrementalActivationsAllDevices: 0,
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
