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
 * Calculate daily activations from metrics for attribution pooling.
 */
export function calculateDailyActivationsFromMetrics(
  metrics: DailyMetric[],
  channel: string,
  dateRange: { start: string; end: string },
): Map<string, number> {
  const dailyActivations = new Map<string, number>();

  const channelMetrics = metrics.filter(
    (m) =>
      m.channel === channel &&
      m.date >= dateRange.start &&
      m.date <= dateRange.end,
  );

  for (const metric of channelMetrics) {
    dailyActivations.set(metric.date, metric.activations);
  }

  return dailyActivations;
}

/**
 * Calculate daily signups from metrics for attribution pooling.
 */
export function calculateDailySignupsFromMetrics(
  metrics: DailyMetric[],
  channel: string,
  dateRange: { start: string; end: string },
): Map<string, number> {
  const dailySignups = new Map<string, number>();

  const channelMetrics = metrics.filter(
    (m) =>
      m.channel === channel &&
      m.date >= dateRange.start &&
      m.date <= dateRange.end,
  );

  for (const metric of channelMetrics) {
    dailySignups.set(metric.date, metric.signups);
  }

  return dailySignups;
}

/**
 * @deprecated Use calculateDailyActivationsFromMetrics instead
 */
export const calculateDailyIncrementalFromMetrics = calculateDailyActivationsFromMetrics;

/**
 * Apply proportional attribution to overlapping activities.
 * Uses clicks to distribute pooled incremental signups.
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

  // Calculate date range for metrics
  const allDates = Array.from(dateMap.keys()).sort();
  if (allDates.length === 0) {
    return reports; // No overlapping activities
  }

  const dateRange = {
    start: allDates[0],
    end: allDates[allDates.length - 1],
  };

  // Build a map of reports by activity ID for quick lookup
  const reportMap = new Map<string, ActivityReport>();
  for (const report of reports) {
    reportMap.set(report.activity.id, report);
  }

  // For each applicable channel, calculate daily activation and signup pools
  const dailyActivationMaps = new Map<string, Map<string, number>>();
  const dailySignupMaps = new Map<string, Map<string, number>>();
  for (const channel of config.channels) {
    dailyActivationMaps.set(
      channel,
      calculateDailyActivationsFromMetrics(metrics, channel, dateRange),
    );
    dailySignupMaps.set(
      channel,
      calculateDailySignupsFromMetrics(metrics, channel, dateRange),
    );
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
    if (report.activity.status !== "live" || (report.incremental <= 0 && report.incrementalActivations <= 0)) {
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

    // Calculate attribution for each day in post-window
    const dailyShares: DailyAttributionShare[] = [];
    let totalAttributedActivations = 0;
    let totalAttributedSignups = 0;

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
        continue; // No activities on this date
      }

      // Calculate total clicks from all overlapping activities
      let totalClicks = 0;
      const overlappingReports: ActivityReport[] = [];

      for (const activityId of overlappingIds) {
        const overlappingReport = reportMap.get(activityId);
        if (!overlappingReport) continue;

        const { clicks: overlappingClicks } = getClicksForAttribution(
          overlappingReport.activity,
        );
        if (overlappingClicks != null && overlappingClicks > 0) {
          totalClicks += overlappingClicks;
          overlappingReports.push(overlappingReport);
        }
      }

      if (totalClicks === 0) {
        // All activities have zero clicks - fall back to equal distribution
        totalClicks = overlappingReports.length;
      }

      // Get pooled activations and signups for this date
      const dailyActivationMap = dailyActivationMaps.get(
        report.activity.channel,
      );
      const dailySignupMap = dailySignupMaps.get(
        report.activity.channel,
      );
      const pooledActivations = dailyActivationMap?.get(dateStr) || 0;
      const pooledSignups = dailySignupMap?.get(dateStr) || 0;

      // Calculate this activity's share
      const share = clicks / totalClicks;
      const attributedActivations = pooledActivations * share;
      const attributedSignups = pooledSignups * share;

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

      totalAttributedActivations += attributedActivations;
      totalAttributedSignups += attributedSignups;
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
