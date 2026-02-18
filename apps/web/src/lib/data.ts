import { prisma } from "./prisma";
import {
  computeAllReports,
  computeActivityReport,
  computeActivityReportWithCleanedBaseline,
  getConfig,
  applyProportionalAttribution,
} from "@mai/core";
import type { Activity, DailyMetric, ActivityReport } from "@mai/core";
import { decontaminateBaselines } from "@mai/core/baseline-decontamination";

/** Map Prisma Activity row to core Activity type */
function toActivity(row: {
  id: string;
  activityType: string;
  channel: string;
  partnerName: string;
  date: string;
  status: string;
  costUsd: number | null;
  deterministicClicks: number | null;
  actualClicks: number | null;
  deterministicTrackedSignups: number | null;
  notes: string | null;
  metadata: string | null;
  contentUrl: string | null;
  channelUrl: string | null;
}): Activity {
  let metadata: Record<string, number> | null = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = null;
    }
  }
  return {
    id: row.id,
    activityType: row.activityType,
    channel: row.channel,
    partnerName: row.partnerName,
    date: row.date,
    status: row.status,
    costUsd: row.costUsd,
    deterministicClicks: row.deterministicClicks,
    actualClicks: row.actualClicks,
    deterministicTrackedSignups: row.deterministicTrackedSignups,
    notes: row.notes,
    metadata,
    contentUrl: row.contentUrl,
    channelUrl: row.channelUrl,
  };
}

/** Map Prisma DailyMetric row to core DailyMetric type */
function toDailyMetric(row: {
  date: string;
  channel: string;
  signups: number;
  activations: number;
}): DailyMetric {
  return {
    date: row.date,
    channel: row.channel,
    signups: row.signups,
    activations: row.activations,
  };
}

export async function getAllReports(): Promise<ActivityReport[]> {
  const [activityRows, metricRows] = await Promise.all([
    prisma.activity.findMany({ orderBy: { date: "asc" } }),
    prisma.dailyMetric.findMany({ orderBy: { date: "asc" } }),
  ]);

  const activities = activityRows.map(toActivity);
  const allMetrics = metricRows.map(toDailyMetric);
  const config = getConfig();

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

  // Apply proportional attribution if enabled
  const finalReports = config.postWindowAttribution?.enabled
    ? applyProportionalAttribution(allReports, allMetrics, config.postWindowAttribution)
    : allReports;

  // Sort by date to maintain original order
  return finalReports.sort(
    (a, b) => a.activity.date.localeCompare(b.activity.date),
  );
}

export async function getReportById(
  id: string,
): Promise<ActivityReport | null> {
  const activityRow = await prisma.activity.findUnique({ where: { id } });
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

  // If decontamination enabled, run full algorithm for the channel
  if (config.decontamination?.enabled) {
    const reportsMap = decontaminateBaselines(
      allActivities,
      metrics,
      config,
      computeActivityReportWithCleanedBaseline,
      computeActivityReport,
    );

    // Apply attribution if enabled
    if (config.postWindowAttribution?.enabled) {
      const reportsArray = Array.from(reportsMap.values());
      const attributedReports = applyProportionalAttribution(
        reportsArray,
        metrics,
        config.postWindowAttribution
      );
      const attributedMap = new Map(
        attributedReports.map(r => [r.activity.id, r])
      );
      return attributedMap.get(id) || null;
    }

    return reportsMap.get(id) || null;
  }

  // Otherwise, single activity calculation
  return computeActivityReport(activity, metrics, config);
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
  const [activityRows, metricRows] = await Promise.all([
    prisma.activity.findMany({
      where: { channel, status: "live" },
      orderBy: { date: "asc" },
    }),
    prisma.dailyMetric.findMany({
      where: { channel },
      orderBy: { date: "asc" },
    }),
  ]);

  const activities = activityRows.map(toActivity);
  const dailyMetrics = metricRows.map(toDailyMetric);
  const config = getConfig();

  // Compute reports with decontamination and attribution
  const reports = computeAllReports(activities, dailyMetrics, config);

  // Apply proportional attribution if enabled
  const finalReports = config.postWindowAttribution?.enabled
    ? applyProportionalAttribution(reports, dailyMetrics, config.postWindowAttribution)
    : reports;

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
