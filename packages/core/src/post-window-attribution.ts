import type {
  Activity,
  ActivityReport,
  DailyMetric,
  PostWindowAttributionConfig,
  DailyAttributionShare,
} from "./types";

/**
 * Get clicks for attribution with fallback hierarchy:
 * 1. actualClicks (measured)
 * 2. deterministicClicks (estimated)
 * 3. metadata.estClicks (fallback)
 */
export function getClicksForAttribution(activity: Activity): {
  clicks: number | null;
  source: "actual" | "deterministic" | "estimated" | null;
} {
  if (activity.actualClicks != null && activity.actualClicks > 0) {
    return { clicks: activity.actualClicks, source: "actual" };
  }
  if (activity.deterministicClicks != null && activity.deterministicClicks > 0) {
    return { clicks: activity.deterministicClicks, source: "deterministic" };
  }
  if (activity.metadata?.estClicks != null && activity.metadata.estClicks > 0) {
    return { clicks: activity.metadata.estClicks, source: "estimated" };
  }
  return { clicks: null, source: null };
}

/**
 * Build a map of which activities overlap on which dates.
 * Only includes "live" activities with positive incremental.
 */
export function buildPostWindowDateMap(
  reports: ActivityReport[],
  channels: string[],
): Map<string, string[]> {
  const dateMap = new Map<string, string[]>();

  for (const report of reports) {
    // Only include live activities in applicable channels with positive incremental
    if (
      report.activity.status !== "live" ||
      !channels.includes(report.activity.channel) ||
      report.incremental <= 0
    ) {
      continue;
    }

    // Add this activity to all dates in its post-window
    const startDate = new Date(report.postWindowStart);
    const endDate = new Date(report.postWindowEnd);

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      const activities = dateMap.get(dateStr) || [];
      activities.push(report.activity.id);
      dateMap.set(dateStr, activities);
    }
  }

  return dateMap;
}

/**
 * Count the number of days in a post-window (inclusive).
 */
function postWindowDays(report: ActivityReport): number {
  const start = new Date(report.postWindowStart);
  const end = new Date(report.postWindowEnd);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Apply proportional attribution to overlapping activities.
 *
 * Algorithm: For each day in an activity's post-window, we pool the
 * pro-rated daily incremental from ALL overlapping activities (each
 * activity contributes its total incremental ÷ post-window days).
 * That pool is then redistributed proportionally by click share.
 *
 * This ensures we only ever redistribute true uplift (incremental),
 * not total observed metrics, so attributed values are always a
 * fraction of the actual uplift — never the full observed total.
 */
export function applyProportionalAttribution(
  reports: ActivityReport[],
  metrics: DailyMetric[],
  config: PostWindowAttributionConfig,
): ActivityReport[] {
  if (!config.enabled || config.channels.length === 0) {
    return reports;
  }

  // Build map of overlapping activities by date
  const dateMap = buildPostWindowDateMap(reports, config.channels);

  if (dateMap.size === 0) {
    return reports; // No activities with positive incremental
  }

  // Build a map of reports by activity ID for quick lookup
  const reportMap = new Map<string, ActivityReport>();
  for (const report of reports) {
    reportMap.set(report.activity.id, report);
  }

  // Process each report
  const attributedReports: ActivityReport[] = [];

  for (const report of reports) {
    // Skip if not in applicable channel
    if (!config.channels.includes(report.activity.channel)) {
      attributedReports.push(report);
      continue;
    }

    // Skip if not live or no positive incremental (signups or activations)
    if (
      report.activity.status !== "live" ||
      (report.incremental <= 0 && report.incrementalActivations <= 0)
    ) {
      attributedReports.push(report);
      continue;
    }

    // Get clicks for this activity
    const { clicks, source } = getClicksForAttribution(report.activity);
    if (clicks == null || clicks === 0) {
      // No click data - assign zero attribution
      attributedReports.push({
        ...report,
        incremental: 0,
        incrementalActivations: 0,
        postWindowAttribution: {
          enabled: true,
          rawIncrementalSignups: report.incremental,
          attributedIncrementalSignups: 0,
          rawIncremental: report.incrementalActivations,
          attributedIncremental: 0,
          dailyShares: [],
          clicksUsed: null,
          clicksSource: null,
        },
      });
      continue;
    }

    // Calculate this activity's daily pro-rated incremental
    const myWindowDays = postWindowDays(report);
    const myDailySignups = report.incremental / myWindowDays;
    const myDailyActivations = report.incrementalActivations / myWindowDays;

    // Calculate attribution for each day in post-window
    const dailyShares: DailyAttributionShare[] = [];
    let totalAttributedSignups = 0;
    let totalAttributedActivations = 0;

    const startDate = new Date(report.postWindowStart);
    const endDate = new Date(report.postWindowEnd);

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];

      // Get overlapping activities for this date
      const overlappingIds = dateMap.get(dateStr) || [];
      if (overlappingIds.length === 0) {
        // No tracked overlaps — this activity gets its own daily incremental
        totalAttributedSignups += myDailySignups;
        totalAttributedActivations += myDailyActivations;
        continue;
      }

      // Pool = sum of each overlapping activity's pro-rated daily incremental
      let pooledSignups = 0;
      let pooledActivations = 0;
      let totalClicks = 0;

      for (const activityId of overlappingIds) {
        const overlappingReport = reportMap.get(activityId);
        if (!overlappingReport) continue;

        const windowDays = postWindowDays(overlappingReport);
        pooledSignups += overlappingReport.incremental / windowDays;
        pooledActivations += overlappingReport.incrementalActivations / windowDays;

        const { clicks: overlappingClicks } = getClicksForAttribution(
          overlappingReport.activity,
        );
        if (overlappingClicks != null && overlappingClicks > 0) {
          totalClicks += overlappingClicks;
        }
      }

      // Fall back to equal distribution if no click data
      if (totalClicks === 0) {
        totalClicks = overlappingIds.length;
      }

      // This activity's share of the pooled incremental
      const share = clicks / totalClicks;
      const attributedSignups = pooledSignups * share;
      const attributedActivations = pooledActivations * share;

      dailyShares.push({
        date: dateStr,
        pooledIncremental: pooledActivations,
        pooledSignups,
        myClicks: clicks,
        totalClicks,
        share,
        attributed: attributedActivations,
        attributedSignups,
        overlappingActivities: overlappingIds,
      });

      totalAttributedSignups += attributedSignups;
      totalAttributedActivations += attributedActivations;
    }

    // Create new report with attribution for both signups and activations
    attributedReports.push({
      ...report,
      incremental: totalAttributedSignups,
      incrementalActivations: totalAttributedActivations,
      postWindowAttribution: {
        enabled: true,
        rawIncrementalSignups: report.incremental,
        attributedIncrementalSignups: totalAttributedSignups,
        rawIncremental: report.incrementalActivations,
        attributedIncremental: totalAttributedActivations,
        dailyShares,
        clicksUsed: clicks,
        clicksSource: source,
      },
    });
  }

  return attributedReports;
}

/**
 * @deprecated Use calculateDailyActivationsFromMetrics instead
 */
export function calculateDailyIncrementalFromMetrics(
  metrics: DailyMetric[],
  channel: string,
  dateRange: { start: string; end: string },
): Map<string, number> {
  const result = new Map<string, number>();
  for (const m of metrics) {
    if (m.channel === channel && m.date >= dateRange.start && m.date <= dateRange.end) {
      result.set(m.date, m.activations);
    }
  }
  return result;
}
