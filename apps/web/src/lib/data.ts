import { prisma } from "./prisma";
import { computeAllReports, getConfig } from "@mai/core";
import type { Activity, DailyMetric, ActivityReport, DailyAttributionShare, DayDataPoint } from "@mai/core";
import { toActivity, toDailyMetric } from "./mappers";

/** Prisma ActivityUplift row (minimal shape we need) */
interface StoredUplift {
  activityId: string;
  baselineWindowStart: string;
  baselineWindowEnd: string;
  baselineAvg: number;
  rawIncrementalSignups: number;
  rawIncrementalActivations: number;
  attributedIncrementalSignups: number;
  attributedIncrementalActivations: number;
  clicksUsed: number | null;
  clicksSource: string | null;
  confidence: string;
  confidenceExplanation: string;
  dailySharesJson: string | null;
  dailyDataJson: string | null;
}

/**
 * Apply stored uplift values to a computed ActivityReport.
 * Overwrites the attribution-dependent fields with the pre-computed,
 * consistently attributed values from the activity_uplifts table.
 */
function applyStoredUplift(report: ActivityReport, stored: StoredUplift): ActivityReport {
  const dailyShares: DailyAttributionShare[] = stored.dailySharesJson
    ? JSON.parse(stored.dailySharesJson)
    : [];

  const dailyData: DayDataPoint[] = stored.dailyDataJson
    ? JSON.parse(stored.dailyDataJson)
    : report.dailyData;

  return {
    ...report,
    // Overwrite with stored attributed values
    incremental: stored.attributedIncrementalSignups,
    incrementalActivations: stored.attributedIncrementalActivations,
    // Restore stored daily data
    dailyData,
    // Populate postWindowAttribution from stored metadata
    postWindowAttribution: {
      enabled: true,
      rawIncrementalSignups: stored.rawIncrementalSignups,
      attributedIncrementalSignups: stored.attributedIncrementalSignups,
      rawIncremental: stored.rawIncrementalActivations,
      attributedIncremental: stored.attributedIncrementalActivations,
      dailyShares,
      clicksUsed: stored.clicksUsed,
      clicksSource: stored.clicksSource as "actual" | "deterministic" | "estimated" | null,
    },
  };
}

export async function getAllReports(): Promise<ActivityReport[]> {
  const [activityRows, metricRows, upliftRows] = await Promise.all([
    prisma.activity.findMany({ orderBy: { date: "asc" } }),
    prisma.dailyMetric.findMany({ orderBy: { date: "asc" } }),
    prisma.activityUplift.findMany(),
  ]);

  const activities = activityRows.map(toActivity);
  const allMetrics = metricRows.map(toDailyMetric);
  const config = getConfig();

  // Index stored uplifts by activity ID
  const upliftById = new Map<string, StoredUplift>(
    upliftRows.map((u) => [u.activityId, u as StoredUplift]),
  );

  // Build a channel-indexed lookup map for metrics
  const metricsByChannel = new Map<string, DailyMetric[]>();
  for (const metric of allMetrics) {
    if (!metricsByChannel.has(metric.channel)) {
      metricsByChannel.set(metric.channel, []);
    }
    metricsByChannel.get(metric.channel)!.push(metric);
  }

  // Build a channel-indexed lookup map for activities
  const activitiesByChannel = new Map<string, Activity[]>();
  for (const activity of activities) {
    if (!activitiesByChannel.has(activity.channel)) {
      activitiesByChannel.set(activity.channel, []);
    }
    activitiesByChannel.get(activity.channel)!.push(activity);
  }

  // Process each channel separately with decontamination
  const allReports: ActivityReport[] = [];
  for (const [channel, channelActivities] of activitiesByChannel) {
    const channelMetrics = metricsByChannel.get(channel) || [];
    const channelReports = computeAllReports(
      channelActivities,
      channelMetrics,
      config,
    );
    allReports.push(...channelReports);
  }

  // Apply stored attributed values where available. Activities without a stored
  // uplift record (e.g., first run before a sync) retain their computeAllReports()
  // values, which already include channel-baseline attribution inline.
  const reportsWithStoredUplifts = allReports.map((report) => {
    const stored = upliftById.get(report.activity.id);
    return stored ? applyStoredUplift(report, stored) : report;
  });

  // Sort by date to maintain original order
  return reportsWithStoredUplifts.sort(
    (a, b) => a.activity.date.localeCompare(b.activity.date),
  );
}

export async function getReportById(
  id: string,
): Promise<ActivityReport | null> {
  const [activityRow, storedUplift] = await Promise.all([
    prisma.activity.findUnique({ where: { id } }),
    prisma.activityUplift.findUnique({ where: { activityId: id } }),
  ]);
  if (!activityRow) return null;

  const activity = toActivity(activityRow);

  // Fetch all activities and metrics on this channel for decontamination
  const [metricRows, allActivityRows] = await Promise.all([
    prisma.dailyMetric.findMany({
      where: { channel: activity.channel },
      orderBy: { date: "asc" },
    }),
    prisma.activity.findMany({
      where: { channel: activity.channel },
      orderBy: { date: "asc" },
    }),
  ]);

  const metrics = metricRows.map(toDailyMetric);
  const allActivities = allActivityRows.map(toActivity);
  const config = getConfig();

  // Run computeAllReports() to get the full channel-baseline report including
  // the per-day dailyData breakdown needed for the activity detail page chart.
  const allReports = computeAllReports(allActivities, metrics, config);
  const computedReport = allReports.find((r) => r.activity.id === id);
  if (!computedReport) return null;

  // If we have stored attributed values, apply them over the computed report.
  // This ensures the canonical attributed incremental figures match what was
  // stored at sync time, while retaining the fresh dailyData from the
  // in-memory computation (needed for the detail page chart).
  if (storedUplift) {
    return applyStoredUplift(computedReport, storedUplift as StoredUplift);
  }

  return computedReport;
}

/** Fetch content view tracking data for an activity */
export async function getContentViews(activityId: string) {
  return prisma.contentView.findMany({
    where: { activityId },
    orderBy: { date: "asc" },
  });
}

/** Fetch LinkedIn engagement tracking data for an activity */
export async function getLinkedInEngagements(activityId: string) {
  return prisma.linkedInEngagement.findMany({
    where: { activityId },
    orderBy: { date: "asc" },
  });
}

/** Fetch aggregated channel analytics */
export async function getChannelAnalytics(channel: string) {
  const [activityRows, metricRows, upliftRows] = await Promise.all([
    prisma.activity.findMany({
      where: { channel, status: "live" },
      orderBy: { date: "asc" },
    }),
    prisma.dailyMetric.findMany({
      where: { channel },
      orderBy: { date: "asc" },
    }),
    prisma.activityUplift.findMany({
      where: { activity: { channel, status: "live" } },
    }),
  ]);

  const activities = activityRows.map(toActivity);
  const dailyMetrics = metricRows.map(toDailyMetric);
  const config = getConfig();

  // Index stored uplifts by activity ID
  const upliftById = new Map<string, StoredUplift>(
    upliftRows.map((u) => [u.activityId, u as StoredUplift]),
  );

  // Compute reports with decontamination
  const reports = computeAllReports(activities, dailyMetrics, config);

  // Apply stored attributed values where available. Activities without a stored
  // uplift record retain their computeAllReports() values, which already include
  // channel-baseline attribution inline.
  const finalReports = reports.map((report) => {
    const stored = upliftById.get(report.activity.id);
    return stored ? applyStoredUplift(report, stored) : report;
  });

  return {
    activities,
    dailyMetrics,
    reports: finalReports,
  };
}

// ---------------------------------------------------------------------------
// YouTube Import Functions
// ---------------------------------------------------------------------------

/**
 * Get all pending search results for review
 */
export async function getPendingSearchResults() {
  return prisma.youTubeSearchResult.findMany({
    where: { status: "pending" },
    orderBy: { searchDate: "desc" },
  });
}

/**
 * Accept a search result (move to ImportedYouTubeVideo)
 */
export async function acceptSearchResult(searchResultId: string) {
  const searchResult = await prisma.youTubeSearchResult.findUnique({
    where: { id: searchResultId },
  });

  if (!searchResult) throw new Error("Search result not found");

  const today = new Date().toISOString().slice(0, 10);

  // Create imported video
  await prisma.importedYouTubeVideo.create({
    data: {
      videoId: searchResult.videoId,
      title: searchResult.title,
      channelTitle: searchResult.channelTitle,
      channelId: searchResult.channelId,
      publishedAt: searchResult.publishedAt,
      url: searchResult.url,
      thumbnailUrl: searchResult.thumbnailUrl,
      importedDate: today,
      status: "active",
    },
  });

  // Mark search result as accepted
  await prisma.youTubeSearchResult.update({
    where: { id: searchResultId },
    data: { status: "accepted" },
  });
}

/**
 * Reject a search result
 */
export async function rejectSearchResult(searchResultId: string) {
  await prisma.youTubeSearchResult.update({
    where: { id: searchResultId },
    data: { status: "rejected" },
  });
}

/**
 * Get all imported videos
 */
export async function getImportedVideos() {
  return prisma.importedYouTubeVideo.findMany({
    where: { status: "active" },
    orderBy: { importedDate: "desc" },
  });
}

/**
 * Get view tracking for an imported video
 */
export async function getImportedVideoViews(videoId: string) {
  return prisma.importedVideoView.findMany({
    where: { videoId },
    orderBy: { date: "asc" },
  });
}

/**
 * Get imported video by ID
 */
export async function getImportedVideoById(id: string) {
  return prisma.importedYouTubeVideo.findUnique({
    where: { id },
  });
}

// ---------------------------------------------------------------------------
// Partner Functions
// ---------------------------------------------------------------------------

/**
 * Get all ActivityReports for a specific partner (case-insensitive name match).
 * Re-uses getAllReports() so decontamination and attribution are applied correctly.
 */
export async function getPartnerReports(
  partnerName: string,
): Promise<ActivityReport[]> {
  const all = await getAllReports();
  return all.filter(
    (r) =>
      r.activity.partnerName.toLowerCase() === partnerName.toLowerCase(),
  );
}

// ---------------------------------------------------------------------------
// Pipeline Status Functions
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  taskName: string;
  label: string;
  description: string;
  /** UTC hour (0-23) */
  scheduleHour: number;
  /** UTC minute */
  scheduleMinute: number;
}

export const PIPELINE_CONFIGS: PipelineConfig[] = [
  {
    taskName: "sync-sheets",
    label: "Google Sheets Sync",
    description: "Imports activities & daily metrics from Google Sheets",
    scheduleHour: 7,
    scheduleMinute: 0,
  },
  {
    taskName: "recompute-attribution",
    label: "Attribution Recompute",
    description: "Recomputes proportional incremental NAU and persists to database (runs inline after sync)",
    scheduleHour: 7,
    scheduleMinute: 5,
  },
  {
    taskName: "track-youtube",
    label: "YouTube View Tracking",
    description: "Tracks view counts for YouTube activity videos",
    scheduleHour: 8,
    scheduleMinute: 0,
  },
  {
    taskName: "track-imported",
    label: "Imported Video Tracking",
    description: "Tracks view counts for all imported YouTube videos",
    scheduleHour: 8,
    scheduleMinute: 15,
  },
  {
    taskName: "track-linkedin",
    label: "LinkedIn Engagement",
    description: "Scrapes likes, comments, reposts & views from LinkedIn posts",
    scheduleHour: 8,
    scheduleMinute: 30,
  },
  {
    taskName: "youtube-search",
    label: "YouTube Search",
    description: "Finds new Granola AI mentions on YouTube",
    scheduleHour: 8,
    scheduleMinute: 0,
  },
];

/** Compute the next UTC run time for a given hour/minute schedule */
function nextRunTime(scheduleHour: number, scheduleMinute: number): Date {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      scheduleHour,
      scheduleMinute,
      0,
      0
    )
  );
  // If that time has already passed today, roll to tomorrow
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export interface PipelineStatus {
  config: PipelineConfig;
  lastRun: {
    id: string;
    startedAt: Date;
    completedAt: Date | null;
    status: string;
    resultJson: string | null;
    errorMessage: string | null;
  } | null;
  nextRun: Date;
}

/**
 * Get the latest execution status for each pipeline.
 */
export async function getPipelineStatuses(): Promise<PipelineStatus[]> {
  // Fetch latest execution per task using DISTINCT ON (PostgreSQL)
  const latestExecutions = await prisma.$queryRaw<
    Array<{
      id: string;
      task_name: string;
      started_at: Date;
      completed_at: Date | null;
      status: string;
      result_json: string | null;
      error_message: string | null;
    }>
  >`
    SELECT DISTINCT ON (task_name)
      id, task_name, started_at, completed_at, status, result_json, error_message
    FROM cron_executions
    ORDER BY task_name, started_at DESC
  `;

  const executionsByTask = new Map(latestExecutions.map((e) => [e.task_name, e]));

  return PIPELINE_CONFIGS.map((config) => {
    const row = executionsByTask.get(config.taskName);
    return {
      config,
      lastRun: row
        ? {
            id: row.id,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            status: row.status,
            resultJson: row.result_json,
            errorMessage: row.error_message,
          }
        : null,
      nextRun: nextRunTime(config.scheduleHour, config.scheduleMinute),
    };
  });
}
