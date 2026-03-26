import { prisma } from "./prisma";
import { computeAllReports, getConfig } from "@mai/core";
import type { Activity, DailyMetric, ActivityReport, DailyAttributionShare, DayDataPoint } from "@mai/core";
import { toActivity, toDailyMetric } from "./mappers";
import { detectGranolaLink, detectSponsoredDisclosure } from "./youtube-metadata";

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
  attributedIncrActAllDevices: number;
  upperBoundIncrSignups: number;
  upperBoundIncrActivations: number;
  upperBoundIncrActAllDevices: number;
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
    incrementalActivationsAllDevices: stored.attributedIncrActAllDevices,
    // Upper-bound estimates (7-day post-window)
    upperBoundIncrementalSignups: stored.upperBoundIncrSignups,
    upperBoundIncrementalActivations: stored.upperBoundIncrActivations,
    upperBoundIncrementalActivationsAllDevices: stored.upperBoundIncrActAllDevices,
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
      where: { channel },
      orderBy: { date: "asc" },
    }),
    prisma.dailyMetric.findMany({
      where: { channel },
      orderBy: { date: "asc" },
    }),
    prisma.activityUplift.findMany({
      where: { activity: { channel } },
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
 * Accept a search result — promote the pending ImportedYouTubeVideo to active.
 * A pending record is created at search time so view tracking starts early.
 */
export async function acceptSearchResult(searchResultId: string) {
  const searchResult = await prisma.youTubeSearchResult.findUnique({
    where: { id: searchResultId },
  });

  if (!searchResult) throw new Error("Search result not found");

  const today = new Date().toISOString().slice(0, 10);

  // Check if this video matches a paid YouTube activity
  const matchingActivity = await prisma.activity.findFirst({
    where: {
      channel: "youtube",
      contentUrl: { contains: searchResult.videoId },
    },
    select: { id: true },
  });

  // Parse description for Granola link signals
  const descText = searchResult.description ?? "";
  const granolaLink = detectGranolaLink(descText);
  const sponsored = detectSponsoredDisclosure(descText);

  // Promote existing pending record to active, or create if it doesn't exist
  // (handles videos discovered before the pending-at-search-time feature)
  await prisma.importedYouTubeVideo.upsert({
    where: { videoId: searchResult.videoId },
    update: {
      status: "active",
      importedDate: today,
      source: matchingActivity ? "paid_sponsorship" : "organic",
      relatedActivityId: matchingActivity?.id ?? null,
      // Carry through description + link signals if not already enriched
      description: searchResult.description,
      granolaLinkInDesc: granolaLink.granolaLinkInDesc,
      granolaLinkType: granolaLink.granolaLinkType,
      sponsoredDisclosure: sponsored,
    },
    create: {
      videoId: searchResult.videoId,
      title: searchResult.title,
      channelTitle: searchResult.channelTitle,
      channelId: searchResult.channelId,
      publishedAt: searchResult.publishedAt,
      url: searchResult.url,
      thumbnailUrl: searchResult.thumbnailUrl,
      description: searchResult.description,
      importedDate: today,
      status: "active",
      source: matchingActivity ? "paid_sponsorship" : "organic",
      relatedActivityId: matchingActivity?.id ?? null,
      granolaLinkInDesc: granolaLink.granolaLinkInDesc,
      granolaLinkType: granolaLink.granolaLinkType,
      sponsoredDisclosure: sponsored,
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
  const searchResult = await prisma.youTubeSearchResult.findUnique({
    where: { id: searchResultId },
  });

  await prisma.youTubeSearchResult.update({
    where: { id: searchResultId },
    data: { status: "rejected" },
  });

  // Archive the pending ImportedYouTubeVideo so it stops being tracked
  if (searchResult) {
    await prisma.importedYouTubeVideo.updateMany({
      where: { videoId: searchResult.videoId, status: "pending" },
      data: { status: "archived" },
    });
  }
}

/**
 * Get all imported videos
 */
export async function getImportedVideos() {
  return prisma.importedYouTubeVideo.findMany({
    where: { status: "active" },
    orderBy: { importedDate: "desc" },
    select: {
      id: true,
      videoId: true,
      title: true,
      channelTitle: true,
      channelId: true,
      publishedAt: true,
      url: true,
      thumbnailUrl: true,
      importedDate: true,
      status: true,
      source: true,
      depthTier: true,
      depthScore: true,
    },
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
 * Get all imported videos with their daily *incremental* view counts
 * for the last N days. Each cell shows new views gained that day
 * (today minus yesterday). Total shows the latest cumulative count.
 */
export async function getImportedVideosWithDailyViews(days = 10) {
  const videos = await getImportedVideos();

  // Build last N+1 dates — the extra prior day is needed to compute
  // the first displayed day's increment.
  const allDates: string[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    allDates.push(d.toISOString().slice(0, 10));
  }
  const displayDates = allDates.slice(1); // the 10 dates we actually show

  // Fetch views for all videos across the full range (including prior day)
  const allViews = await prisma.importedVideoView.findMany({
    where: {
      videoId: { in: videos.map((v) => v.id) },
      date: { in: allDates },
    },
  });

  // Build lookup: videoId -> date -> viewCount
  const viewMap = new Map<string, Map<string, number>>();
  for (const v of allViews) {
    if (!viewMap.has(v.videoId)) viewMap.set(v.videoId, new Map());
    viewMap.get(v.videoId)!.set(v.date, v.viewCount);
  }

  const result = videos.map((video) => {
    const videoViews = viewMap.get(video.id);
    const dailyViews: Record<string, number | null> = {};
    let totalViews: number | null = null;

    for (let i = 0; i < displayDates.length; i++) {
      const date = displayDates[i];
      const prevDate = allDates[i]; // one day before displayDates[i]
      const curr = videoViews?.get(date) ?? null;
      const prev = videoViews?.get(prevDate) ?? null;

      if (curr !== null && prev !== null) {
        dailyViews[date] = curr - prev;
      } else {
        dailyViews[date] = null;
      }

      if (curr !== null) totalViews = curr;
    }

    return { ...video, dailyViews, totalViews, dates: displayDates };
  });

  return { videos: result, dates: displayDates };
}

/**
 * Get imported video by ID
 */
export async function getImportedVideoById(id: string) {
  return prisma.importedYouTubeVideo.findUnique({
    where: { id },
  });
}

/**
 * Get imported videos with daily views for a specific channel (by channelTitle).
 */
export async function getChannelVideosWithDailyViews(channelTitle: string, days = 10) {
  // Build last N+1 dates (extra day for increment computation)
  const allDates: string[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    allDates.push(d.toISOString().slice(0, 10));
  }
  const displayDates = allDates.slice(1);

  const videos = await prisma.importedYouTubeVideo.findMany({
    where: { status: "active", channelTitle },
    orderBy: { importedDate: "desc" },
  });

  const allViews = await prisma.importedVideoView.findMany({
    where: {
      videoId: { in: videos.map((v) => v.id) },
      date: { in: allDates },
    },
  });

  const viewMap = new Map<string, Map<string, number>>();
  for (const v of allViews) {
    if (!viewMap.has(v.videoId)) viewMap.set(v.videoId, new Map());
    viewMap.get(v.videoId)!.set(v.date, v.viewCount);
  }

  const result = videos.map((video) => {
    const videoViews = viewMap.get(video.id);
    const dailyViews: Record<string, number | null> = {};
    let totalViews: number | null = null;

    for (let i = 0; i < displayDates.length; i++) {
      const date = displayDates[i];
      const prevDate = allDates[i];
      const curr = videoViews?.get(date) ?? null;
      const prev = videoViews?.get(prevDate) ?? null;

      if (curr !== null && prev !== null) {
        dailyViews[date] = curr - prev;
      } else {
        dailyViews[date] = null;
      }

      if (curr !== null) totalViews = curr;
    }

    return { ...video, dailyViews, totalViews, dates: displayDates };
  });

  return { videos: result, dates: displayDates };
}

/**
 * Get YouTube channels (publishers) with aggregate daily view increments.
 * Groups imported videos by channelTitle and sums up their daily gains.
 */
export async function getYouTubeChannelsWithDailyViews(days = 10) {
  const { videos, dates } = await getImportedVideosWithDailyViews(days);

  // Group by channel
  const channelMap = new Map<
    string,
    {
      channelTitle: string;
      videoCount: number;
      paidCount: number;
      totalViews: number;
      dailyViews: Record<string, number | null>;
    }
  >();

  for (const video of videos) {
    const key = video.channelTitle;
    if (!channelMap.has(key)) {
      channelMap.set(key, {
        channelTitle: key,
        videoCount: 0,
        paidCount: 0,
        totalViews: 0,
        dailyViews: {},
      });
      // Initialize all dates to null
      for (const d of dates) {
        channelMap.get(key)!.dailyViews[d] = null;
      }
    }

    const ch = channelMap.get(key)!;
    ch.videoCount++;
    if (video.source === "paid_sponsorship") ch.paidCount++;
    ch.totalViews += video.totalViews ?? 0;

    // Sum daily increments
    for (const d of dates) {
      const inc = video.dailyViews[d];
      if (inc !== null) {
        ch.dailyViews[d] = (ch.dailyViews[d] ?? 0) + inc;
      }
    }
  }

  const channels = Array.from(channelMap.values()).sort(
    (a, b) => b.totalViews - a.totalViews,
  );

  return { channels, dates };
}

/**
 * Get weekly time-series data for the YouTube chart:
 * - Total views across all imported videos (summed daily, then grouped by week)
 * - Accounts created (signups) from DailyMetric where channel = "youtube"
 * - NAU (activations) from DailyMetric where channel = "youtube"
 *
 * Views are computed per-video first: each video's first tracked day is
 * excluded because it represents accumulated lifetime views up to ingestion,
 * not a single day's gain. Only genuine day-over-day increments are summed.
 */
export async function getYouTubeWeeklyTimeSeries() {
  // Fetch all imported video views, video metadata, and YouTube daily metrics
  const [allViews, metricRows, videos] = await Promise.all([
    prisma.importedVideoView.findMany({
      orderBy: { date: "asc" },
    }),
    prisma.dailyMetric.findMany({
      where: { channel: "youtube" },
      orderBy: { date: "asc" },
    }),
    prisma.importedYouTubeVideo.findMany({
      where: { status: "active" },
      select: { id: true, channelTitle: true },
    }),
  ]);

  // Identify Granola-owned videos — their ad-driven view spikes confound
  // the chart (they account for 56% of total views but are concentrated
  // in 2 promotional spike weeks)
  const granolaOwnedIds = new Set(
    videos
      .filter((v) => v.channelTitle.toLowerCase() === "granola")
      .map((v) => v.id)
  );

  // Group views by video, sorted by date (excluding Granola-owned)
  const viewsByVideo = new Map<string, { date: string; viewCount: number }[]>();
  for (const v of allViews) {
    if (granolaOwnedIds.has(v.videoId)) continue;
    if (!viewsByVideo.has(v.videoId)) viewsByVideo.set(v.videoId, []);
    viewsByVideo.get(v.videoId)!.push({ date: v.date, viewCount: v.viewCount });
  }

  // Compute per-video daily increments:
  //  - Skip each video's first tracked day (accumulated lifetime views, not one day)
  //  - Normalize multi-day gaps by spreading increments evenly
  const dailyIncrementalViews = new Map<string, number>();
  for (const [, videoViews] of viewsByVideo) {
    videoViews.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < videoViews.length; i++) {
      const diff = videoViews[i].viewCount - videoViews[i - 1].viewCount;
      if (diff < 0) continue;

      // Check for multi-day gaps between tracking points
      const gapMs =
        new Date(videoViews[i].date).getTime() -
        new Date(videoViews[i - 1].date).getTime();
      const gapDays = Math.round(gapMs / 86400000);

      if (gapDays > 1) {
        // Spread increment across the gap days
        const dailyRate = diff / gapDays;
        for (let d = 1; d <= gapDays; d++) {
          const fillDate = new Date(
            new Date(videoViews[i - 1].date).getTime() + d * 86400000
          );
          const dateStr = fillDate.toISOString().slice(0, 10);
          dailyIncrementalViews.set(
            dateStr,
            (dailyIncrementalViews.get(dateStr) ?? 0) + dailyRate
          );
        }
      } else {
        const date = videoViews[i].date;
        dailyIncrementalViews.set(
          date,
          (dailyIncrementalViews.get(date) ?? 0) + diff
        );
      }
    }
  }

  // Helper: ISO week key
  function getWeekKey(dateStr: string): string {
    const d = new Date(dateStr);
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }

  // Aggregate views by week
  const viewsByWeek = new Map<string, number>();
  for (const [date, inc] of dailyIncrementalViews) {
    const week = getWeekKey(date);
    viewsByWeek.set(week, (viewsByWeek.get(week) ?? 0) + inc);
  }

  // Aggregate metrics by week
  const metricsByWeek = new Map<string, { signups: number; activations: number }>();
  for (const m of metricRows) {
    const week = getWeekKey(m.date);
    const existing = metricsByWeek.get(week) ?? { signups: 0, activations: 0 };
    metricsByWeek.set(week, {
      signups: existing.signups + m.signups,
      activations: existing.activations + m.activations,
    });
  }

  // Combine into time series — only include weeks up to today
  const today = new Date().toISOString().slice(0, 10);
  const todayWeek = getWeekKey(today);

  const allWeeks = new Set([...viewsByWeek.keys(), ...metricsByWeek.keys()]);
  const timeSeries = Array.from(allWeeks)
    .filter((w) => w <= todayWeek)
    .sort()
    .map((week) => ({
      period: week,
      views: Math.round(viewsByWeek.get(week) ?? 0),
      signups: metricsByWeek.get(week)?.signups ?? 0,
      activations: metricsByWeek.get(week)?.activations ?? 0,
    }));

  return timeSeries;
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
  {
    taskName: "sync-dub",
    label: "Dub Analytics Sync",
    description: "Imports daily click counts per Dub short link for cross-reference with sheet data",
    scheduleHour: 7,
    scheduleMinute: 0,
  },
  {
    taskName: "sync-employee-linkedin",
    label: "Employee LinkedIn Sync",
    description: "Syncs LinkedIn posts and engagement metrics for connected employee accounts via Unipile",
    scheduleHour: 9,
    scheduleMinute: 0,
  },
  {
    taskName: "sync-growi",
    label: "Growi UGC Sync",
    description: "Imports daily UGC creator programme stats from Growi (TikTok & Instagram)",
    scheduleHour: 12,
    scheduleMinute: 25,
  },
  {
    taskName: "sync-podscribe",
    label: "Podscribe Podcast Sync",
    description: "Imports podcast campaign impressions, spend, and creates activities from Podscribe",
    scheduleHour: 12,
    scheduleMinute: 30,
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

// ---------------------------------------------------------------------------
// Build in Public (Employee LinkedIn) Functions
// ---------------------------------------------------------------------------

/** Get all connected employee LinkedIn accounts with their user info */
export async function getConnectedLinkedInAccounts() {
  return prisma.unipileLinkedInAccount.findMany({
    where: { status: "connected" },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { connectedAt: "asc" },
  });
}

/** Get the current user's LinkedIn account with sync details */
export async function getUserLinkedInAccount(userId: string) {
  // Check for connected account first
  const connected = await prisma.unipileLinkedInAccount.findFirst({
    where: { userId, status: "connected" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });
  if (connected) return connected;

  // Check for pending (include recently set-to-pending disconnected records)
  const pending = await prisma.unipileLinkedInAccount.findFirst({
    where: { userId, status: "pending" },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });
  if (pending) return pending;

  return null;
}

/** ISO week helper — returns "YYYY-WXX" for a given date string */
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const utc = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  );
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Get aggregate weekly impressions and engagement across all employees */
const EMPLOYEE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
];

/** Optional date range filter for LinkedIn queries */
export interface DateRange {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
}

export async function getEmployeeLinkedInWeeklyStats(
  dateRange?: DateRange
): Promise<{
  employees: Array<{ key: string; name: string; color: string }>;
  data: Array<Record<string, string | number>>;
}> {
  const posts = await prisma.employeeLinkedInPost.findMany({
    where: {
      ...(dateRange
        ? { postDate: { gte: dateRange.from, lte: dateRange.to } }
        : {}),
      account: { status: "connected" },
    },
    orderBy: { postDate: "asc" },
    select: {
      postDate: true,
      impressions: true,
      reactions: true,
      comments: true,
      reposts: true,
      account: {
        select: {
          userId: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  // Build employee metadata (stable key from userId)
  const employeeMap = new Map<
    string,
    { key: string; name: string; userId: string }
  >();
  for (const post of posts) {
    const uid = post.account.userId;
    if (!employeeMap.has(uid)) {
      const displayName = post.account.user.name ?? post.account.user.email;
      const key = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      employeeMap.set(uid, { key, name: displayName, userId: uid });
    }
  }

  // Assign colors
  const employees = Array.from(employeeMap.values()).map((emp, i) => ({
    key: emp.key,
    name: emp.name,
    color: EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length],
  }));

  // Group by (week, employeeKey)
  const weeklyMap = new Map<string, Record<string, number>>();
  const allWeeks = new Set<string>();

  for (const post of posts) {
    const week = getWeekKey(post.postDate);
    allWeeks.add(week);
    const emp = employeeMap.get(post.account.userId)!;

    if (!weeklyMap.has(week)) weeklyMap.set(week, {});
    const row = weeklyMap.get(week)!;

    const impKey = `${emp.key}_impressions`;
    const engKey = `${emp.key}_engagement`;
    row[impKey] = (row[impKey] ?? 0) + post.impressions;
    row[engKey] =
      (row[engKey] ?? 0) + post.reactions + post.comments + post.reposts;
  }

  // Pivot into sorted flat array (fill missing employee weeks with 0)
  const data = Array.from(allWeeks)
    .sort()
    .map((period) => {
      const row: Record<string, string | number> = { period };
      const weekData = weeklyMap.get(period) ?? {};
      for (const emp of employees) {
        row[`${emp.key}_impressions`] = weekData[`${emp.key}_impressions`] ?? 0;
        row[`${emp.key}_engagement`] = weekData[`${emp.key}_engagement`] ?? 0;
      }
      return row;
    });

  return { employees, data };
}

/** Get per-employee breakdown with totals */
export async function getEmployeeLinkedInBreakdown(dateRange?: DateRange) {
  const accounts = await prisma.unipileLinkedInAccount.findMany({
    where: { status: "connected" },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      posts: {
        where: dateRange
          ? { postDate: { gte: dateRange.from, lte: dateRange.to } }
          : {},
        select: {
          impressions: true,
          reactions: true,
          comments: true,
          reposts: true,
        },
      },
    },
  });

  return accounts.map((account) => ({
    userId: account.user.id,
    name: account.user.name ?? account.user.email,
    email: account.user.email,
    image: account.user.image,
    linkedinName: account.linkedinName,
    postCount: account.posts.length,
    totalImpressions: account.posts.reduce((s, p) => s + p.impressions, 0),
    totalReactions: account.posts.reduce((s, p) => s + p.reactions, 0),
    totalComments: account.posts.reduce((s, p) => s + p.comments, 0),
    totalReposts: account.posts.reduce((s, p) => s + p.reposts, 0),
    lastSyncAt: account.lastSyncAt,
  }));
}

/** Get top posts across all employees, sorted by impressions */
export async function getTopEmployeePosts(limit = 20, dateRange?: DateRange) {
  return prisma.employeeLinkedInPost.findMany({
    where: {
      ...(dateRange
        ? { postDate: { gte: dateRange.from, lte: dateRange.to } }
        : {}),
      account: { status: "connected" },
    },
    orderBy: { impressions: "desc" },
    take: limit,
    include: {
      account: {
        include: {
          user: { select: { name: true, email: true, image: true } },
        },
      },
    },
  });
}

// ── Company LinkedIn ────────────────────────────────────────────────

/** Get weekly impressions and engagement for the company page */
export async function getCompanyLinkedInWeeklyStats(): Promise<{
  data: Array<{
    period: string;
    impressions: number;
    reactions: number;
    comments: number;
    reposts: number;
    engagement: number;
    posts: number;
  }>;
}> {
  const posts = await prisma.companyLinkedInPost.findMany({
    where: { postDate: { gte: "2026-01-01" } },
    orderBy: { postDate: "asc" },
    select: {
      postDate: true,
      impressions: true,
      reactions: true,
      comments: true,
      reposts: true,
    },
  });

  const weeklyMap = new Map<
    string,
    {
      impressions: number;
      reactions: number;
      comments: number;
      reposts: number;
      posts: number;
    }
  >();

  for (const post of posts) {
    const week = getWeekKey(post.postDate);
    const existing = weeklyMap.get(week) ?? {
      impressions: 0,
      reactions: 0,
      comments: 0,
      reposts: 0,
      posts: 0,
    };
    weeklyMap.set(week, {
      impressions: existing.impressions + post.impressions,
      reactions: existing.reactions + post.reactions,
      comments: existing.comments + post.comments,
      reposts: existing.reposts + post.reposts,
      posts: existing.posts + 1,
    });
  }

  const data = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, stats]) => ({
      period,
      ...stats,
      engagement: stats.reactions + stats.comments + stats.reposts,
    }));

  return { data };
}

/** Get aggregate totals for the company page */
export async function getCompanyLinkedInTotals() {
  const posts = await prisma.companyLinkedInPost.findMany({
    where: { postDate: { gte: "2026-01-01" } },
    select: {
      impressions: true,
      reactions: true,
      comments: true,
      reposts: true,
    },
  });

  return {
    totalPosts: posts.length,
    totalImpressions: posts.reduce((s, p) => s + p.impressions, 0),
    totalReactions: posts.reduce((s, p) => s + p.reactions, 0),
    totalComments: posts.reduce((s, p) => s + p.comments, 0),
    totalReposts: posts.reduce((s, p) => s + p.reposts, 0),
    totalEngagement: posts.reduce(
      (s, p) => s + p.reactions + p.comments + p.reposts,
      0
    ),
  };
}

/** Get top company posts sorted by reactions (impressions unavailable via search API) */
export async function getTopCompanyPosts(limit = 20) {
  return prisma.companyLinkedInPost.findMany({
    where: { postDate: { gte: "2026-01-01" } },
    orderBy: { reactions: "desc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// LinkedIn Ads
// ---------------------------------------------------------------------------

/** Get the current LinkedIn Ads connection (if any) */
export async function getLinkedInAdsConnection() {
  return prisma.linkedInAdsConnection.findFirst();
}

/** Get all ad campaigns with aggregated lifetime stats */
export async function getLinkedInAdsCampaigns() {
  const campaigns = await prisma.linkedInAdCampaign.findMany({
    include: {
      dailyStats: {
        select: {
          impressions: true,
          clicks: true,
          spend: true,
          conversions: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return campaigns.map((c) => ({
    id: c.id,
    campaignUrn: c.campaignUrn,
    name: c.name,
    status: c.status,
    type: c.type,
    costType: c.costType,
    totalImpressions: c.dailyStats.reduce((s, d) => s + d.impressions, 0),
    totalClicks: c.dailyStats.reduce((s, d) => s + d.clicks, 0),
    totalSpend: c.dailyStats.reduce((s, d) => s + d.spend, 0),
    totalConversions: c.dailyStats.reduce((s, d) => s + d.conversions, 0),
    ctr:
      c.dailyStats.reduce((s, d) => s + d.impressions, 0) > 0
        ? c.dailyStats.reduce((s, d) => s + d.clicks, 0) /
          c.dailyStats.reduce((s, d) => s + d.impressions, 0)
        : 0,
    cpm:
      c.dailyStats.reduce((s, d) => s + d.impressions, 0) > 0
        ? (c.dailyStats.reduce((s, d) => s + d.spend, 0) /
            c.dailyStats.reduce((s, d) => s + d.impressions, 0)) *
          1000
        : 0,
  }));
}

/** Get weekly aggregated ad analytics */
export async function getLinkedInAdsWeeklyStats(dateRange?: DateRange) {
  const where: Record<string, unknown> = {};
  if (dateRange) {
    where.date = { gte: dateRange.from, lte: dateRange.to };
  }

  const daily = await prisma.linkedInAdDaily.findMany({
    where,
    select: {
      date: true,
      impressions: true,
      clicks: true,
      spend: true,
      conversions: true,
    },
    orderBy: { date: "asc" },
  });

  // Group by ISO week (same pattern as employee LinkedIn stats)
  const weekMap = new Map<
    string,
    {
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
    }
  >();

  for (const row of daily) {
    const d = new Date(row.date + "T00:00:00Z");
    // ISO week: Monday-based
    const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - day + 1);
    const weekKey = monday.toISOString().slice(0, 10);

    const existing = weekMap.get(weekKey) ?? {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
    };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.spend += row.spend;
    existing.conversions += row.conversions;
    weekMap.set(weekKey, existing);
  }

  const data = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, stats]) => ({
      period,
      ...stats,
    }));

  return { data };
}

/** Get company-level ad analytics (MEMBER_COMPANY pivot) with resolved names */
export async function getLinkedInAdsCompanyStats(dateRange?: DateRange) {
  const connection = await prisma.linkedInAdsConnection.findFirst();
  if (!connection?.accessToken || !connection.adAccountId) return [];

  const { getCompanyAnalytics } = await import("./linkedin-ads");

  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const range = dateRange ?? {
    from: ninetyDaysAgo.toISOString().slice(0, 10),
    to: today,
  };

  const rows = await getCompanyAnalytics(
    connection.accessToken,
    connection.adAccountId,
    { start: range.from, end: range.to }
  );

  // Sort by impressions descending
  rows.sort((a, b) => b.impressions - a.impressions);

  // Split: named companies (>=1000 impressions) + "Other" bucket
  const named = rows.filter((r) => r.impressions >= 1000);
  const rest = rows.filter((r) => r.impressions < 1000);

  // Aggregate the "other" bucket
  const otherBucket = {
    orgId: "__other__",
    orgUrn: "",
    impressions: rest.reduce((s, r) => s + r.impressions, 0),
    clicks: rest.reduce((s, r) => s + r.clicks, 0),
    spend: rest.reduce((s, r) => s + r.spend, 0),
    landingPageClicks: rest.reduce((s, r) => s + r.landingPageClicks, 0),
    conversions: rest.reduce((s, r) => s + r.conversions, 0),
    companyCount: rest.length,
  };

  // Fetch cached names for named companies
  const orgIds = named.map((r) => r.orgId).filter(Boolean);
  const cached = await prisma.linkedInOrgNameCache.findMany({
    where: { orgId: { in: orgIds } },
  });
  const nameMap = new Map(cached.map((c) => [c.orgId, c.name]));

  const result = named.map((r) => ({
    orgId: r.orgId,
    orgUrn: r.orgUrn,
    name: nameMap.get(r.orgId) ?? null,
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
    spend: r.spend,
    landingPageClicks: r.landingPageClicks,
    cpc: r.clicks > 0 ? r.spend / r.clicks : 0,
    conversions: r.conversions,
  }));

  // Append "Other" row at the end
  if (rest.length > 0) {
    result.push({
      orgId: "__other__",
      orgUrn: "",
      name: `Other (${rest.length} companies)`,
      impressions: otherBucket.impressions,
      clicks: otherBucket.clicks,
      ctr:
        otherBucket.impressions > 0
          ? otherBucket.clicks / otherBucket.impressions
          : 0,
      spend: otherBucket.spend,
      landingPageClicks: otherBucket.landingPageClicks,
      cpc:
        otherBucket.clicks > 0
          ? otherBucket.spend / otherBucket.clicks
          : 0,
      conversions: otherBucket.conversions,
    });
  }

  return result;
}

/** Resolve unresolved org names via Unipile and cache them */
export async function resolveUnresolvedOrgNames(limit = 50): Promise<{
  resolved: number;
  failed: number;
}> {
  const { lookupOrgName } = await import("./linkedin-ads");

  // Find org IDs that haven't been resolved yet
  const unresolved = await prisma.linkedInOrgNameCache.findMany({
    where: { resolved: false },
    take: limit,
  });

  let resolved = 0;
  let failed = 0;

  for (const entry of unresolved) {
    const name = await lookupOrgName(entry.orgId);
    await prisma.linkedInOrgNameCache.update({
      where: { orgId: entry.orgId },
      data: { name, resolved: true },
    });
    if (name) resolved++;
    else failed++;
    // Rate limit Unipile calls (500ms avoids throttling)
    await new Promise((r) => setTimeout(r, 500));
  }

  return { resolved, failed };
}

/** Ensure org IDs from analytics exist in the cache table */
export async function ensureOrgCacheEntries(orgIds: string[]) {
  const existing = await prisma.linkedInOrgNameCache.findMany({
    where: { orgId: { in: orgIds } },
    select: { orgId: true },
  });
  const existingSet = new Set(existing.map((e) => e.orgId));
  const newIds = orgIds.filter((id) => id && !existingSet.has(id));

  if (newIds.length > 0) {
    await prisma.linkedInOrgNameCache.createMany({
      data: newIds.map((id) => ({ orgId: id, resolved: false })),
      skipDuplicates: true,
    });
  }

  return newIds.length;
}

/** Get aggregate totals for ad performance */
export async function getLinkedInAdsTotals(dateRange?: DateRange) {
  const where: Record<string, unknown> = {};
  if (dateRange) {
    where.date = { gte: dateRange.from, lte: dateRange.to };
  }

  const daily = await prisma.linkedInAdDaily.findMany({
    where,
    select: {
      impressions: true,
      clicks: true,
      spend: true,
      conversions: true,
      landingPageClicks: true,
    },
  });

  const totalImpressions = daily.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = daily.reduce((s, d) => s + d.clicks, 0);
  const totalSpend = daily.reduce((s, d) => s + d.spend, 0);
  const totalConversions = daily.reduce((s, d) => s + d.conversions, 0);
  const totalLandingPageClicks = daily.reduce(
    (s, d) => s + d.landingPageClicks,
    0
  );

  return {
    totalImpressions,
    totalClicks,
    totalSpend,
    totalConversions,
    totalLandingPageClicks,
    ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
  };
}

// ---------------------------------------------------------------------------
// LinkedIn Ads Creative Stats
// ---------------------------------------------------------------------------

export interface CreativeWithCampaign {
  creativeId: string;
  creativeUrn: string;
  name: string | null;
  intendedStatus: string | null;
  contentRef: string | null;
  isServing: boolean;
  creatorName: string | null;
  apiCreatedAt: Date | null;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number;
  cpm: number;
  conversions: number;
  landingPageClicks: number;
}

export interface AggregatedCreative {
  contentRef: string;
  name: string | null;
  displayName: string; // Always has a value: name, campaign-derived label, or short ID
  linkedInPostUrl: string | null; // Link to view the post on LinkedIn
  campaignCount: number;
  totalImpressions: number;
  totalClicks: number;
  totalCtr: number;
  totalSpend: number;
  totalCpc: number;
  totalCpm: number;
  totalConversions: number;
  totalLandingPageClicks: number;
  campaigns: {
    campaignId: string;
    campaignName: string;
    campaignStatus: string;
    creativeUrn: string;
    intendedStatus: string | null;
    isServing: boolean;
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    cpc: number;
    cpm: number;
    conversions: number;
    landingPageClicks: number;
  }[];
}

/**
 * Get creative performance stats aggregated by content asset.
 * Creatives sharing the same contentRef (same underlying post/asset)
 * are grouped together with a nested campaign-level breakdown.
 */
export async function getLinkedInAdsCreativeStats(
  dateRange?: DateRange
): Promise<AggregatedCreative[]> {
  const dateWhere: Record<string, unknown> = {};
  if (dateRange) {
    dateWhere.date = { gte: dateRange.from, lte: dateRange.to };
  }

  // Get all creatives with their campaign info and daily stats
  const creatives = await prisma.linkedInAdCreative.findMany({
    include: {
      campaign: { select: { id: true, campaignUrn: true, name: true, status: true } },
      dailyStats: {
        where: dateWhere,
        select: {
          impressions: true,
          clicks: true,
          spend: true,
          conversions: true,
          landingPageClicks: true,
        },
      },
    },
    // Include creatorName and apiCreatedAt for display name generation
  });

  // Compute per-creative totals
  const creativeRows: CreativeWithCampaign[] = creatives.map((cr) => {
    const impressions = cr.dailyStats.reduce((s, d) => s + d.impressions, 0);
    const clicks = cr.dailyStats.reduce((s, d) => s + d.clicks, 0);
    const spend = cr.dailyStats.reduce((s, d) => s + d.spend, 0);
    const conversions = cr.dailyStats.reduce((s, d) => s + d.conversions, 0);
    const landingPageClicks = cr.dailyStats.reduce(
      (s, d) => s + d.landingPageClicks,
      0
    );

    return {
      creativeId: cr.id,
      creativeUrn: cr.creativeUrn,
      name: cr.name,
      intendedStatus: cr.intendedStatus,
      contentRef: cr.contentRef,
      isServing: cr.isServing,
      creatorName: cr.creatorName,
      apiCreatedAt: cr.apiCreatedAt,
      campaignId: cr.campaign.id,
      campaignName: cr.campaign.name,
      campaignStatus: cr.campaign.status,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
      spend,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      conversions,
      landingPageClicks,
    };
  });

  // Group by contentRef (or creativeUrn if no contentRef)
  const groups = new Map<string, CreativeWithCampaign[]>();
  for (const row of creativeRows) {
    const key = row.contentRef || row.creativeUrn;
    const existing = groups.get(key) || [];
    existing.push(row);
    groups.set(key, existing);
  }

  // Build aggregated result
  const result: AggregatedCreative[] = [];
  for (const [contentRef, rows] of groups) {
    const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
    const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
    const totalConversions = rows.reduce((s, r) => s + r.conversions, 0);
    const totalLandingPageClicks = rows.reduce(
      (s, r) => s + r.landingPageClicks,
      0
    );

    // Use the first creative's name as the group name
    const name = rows.find((r) => r.name)?.name || null;

    // Get creator name(s) for this group
    const creatorNames = [
      ...new Set(rows.map((r) => r.creatorName).filter(Boolean)),
    ] as string[];
    const creatorLabel = creatorNames.length > 0 ? creatorNames[0] : null;

    // Get earliest creation date for this group
    const creationDates = rows
      .map((r) => r.apiCreatedAt)
      .filter(Boolean) as Date[];
    const earliestDate =
      creationDates.length > 0
        ? new Date(Math.min(...creationDates.map((d) => d.getTime())))
        : null;
    const dateLabel = earliestDate
      ? earliestDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    // Build a display name with rich context
    // Priority: explicit name + date > campaign-derived + date > ID
    let displayName = name || "";
    if (!displayName) {
      const campaignNames = [...new Set(rows.map((r) => r.campaignName))];

      // Extract meaningful parts from structured campaign names
      // e.g. "KV_Video TL ads_03/26_Sales_UK/NA_Cold" → "Video TL · Sales · UK/NA"
      const summarizeCampaign = (cn: string): string => {
        // Try to extract type (Video, TL), audience (Sales, Product/Operations), and geo
        const parts: string[] = [];
        if (/video/i.test(cn)) parts.push("Video");
        else if (/TL\b/i.test(cn)) parts.push("TL");
        if (/sales/i.test(cn)) parts.push("Sales");
        if (/product|operations/i.test(cn)) parts.push("Product/Ops");
        if (/brand\s*awareness/i.test(cn)) parts.push("Brand");
        if (parts.length > 0) return parts.join(" · ");
        return cn; // Fallback to full name
      };

      if (campaignNames.length === 1) {
        const summary = summarizeCampaign(campaignNames[0]);
        displayName = dateLabel
          ? `${summary} · ${dateLabel}`
          : summary;
      } else if (campaignNames.length > 1) {
        // Multi-campaign: show common themes
        const summaries = [
          ...new Set(campaignNames.map(summarizeCampaign)),
        ];
        const label =
          summaries.length <= 2
            ? summaries.join(" + ")
            : `${summaries[0]} +${summaries.length - 1} more`;
        displayName = dateLabel
          ? `${label} · ${dateLabel}`
          : label;
      } else {
        displayName = dateLabel
          ? `Ad created ${dateLabel}`
          : `Ad asset #${contentRef.split(":").pop()?.slice(-6) ?? "?"}`;
      }
    } else if (dateLabel) {
      // Explicit name exists — append date for context
      displayName = `${displayName} · ${dateLabel}`;
    }

    // Prefix with creator name if available
    if (creatorLabel && !displayName.includes(creatorLabel)) {
      displayName = `${creatorLabel} · ${displayName}`;
    }

    // Build LinkedIn post URL from contentRef if it's a share or ugcPost
    let linkedInPostUrl: string | null = null;
    const ref = rows[0]?.contentRef;
    if (ref && (ref.includes("share:") || ref.includes("ugcPost:"))) {
      linkedInPostUrl = `https://www.linkedin.com/feed/update/${ref}`;
    }

    result.push({
      contentRef,
      name,
      displayName,
      linkedInPostUrl,
      campaignCount: new Set(rows.map((r) => r.campaignId)).size,
      totalImpressions,
      totalClicks,
      totalCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      totalSpend,
      totalCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      totalCpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      totalConversions,
      totalLandingPageClicks,
      campaigns: rows.map((r) => ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        campaignStatus: r.campaignStatus,
        creativeUrn: r.creativeUrn,
        intendedStatus: r.intendedStatus,
        isServing: r.isServing,
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: r.ctr,
        spend: r.spend,
        cpc: r.cpc,
        cpm: r.cpm,
        conversions: r.conversions,
        landingPageClicks: r.landingPageClicks,
      })),
    });
  }

  // Sort by total impressions descending
  result.sort((a, b) => b.totalImpressions - a.totalImpressions);

  return result;
}

// ---------------------------------------------------------------------------
// Dub Link → Newsletter matching
// ---------------------------------------------------------------------------

/**
 * For each newsletter activity that has a Dub link mapped to its partner,
 * sum the Dub clicks during the activity's post-window (date + 2 days for newsletters).
 *
 * Returns a Map: activityId → { dubClicks, dubLeads, shortLink }
 */
export async function getDubClicksByActivity(): Promise<
  Map<string, { dubClicks: number; dubLeads: number; shortLink: string }>
> {
  // 1. Get all mappings (partnerName → shortLink)
  const mappings = await prisma.dubNewsletterMapping.findMany();
  if (mappings.length === 0) return new Map();

  const partnerToLink = new Map(
    mappings.map((m) => [m.partnerName, m.shortLink])
  );

  // 2. Get all newsletter activities
  const activities = await prisma.activity.findMany({
    where: {
      channel: "newsletter",
      partnerName: { in: mappings.map((m) => m.partnerName) },
    },
    select: { id: true, partnerName: true, date: true },
  });

  if (activities.length === 0) return new Map();

  // 3. For each activity, sum dub_link_daily clicks in [date, date+2]
  const result = new Map<
    string,
    { dubClicks: number; dubLeads: number; shortLink: string }
  >();

  for (const activity of activities) {
    const shortLink = partnerToLink.get(activity.partnerName);
    if (!shortLink) continue;

    const startDate = activity.date;
    const endDate = addDaysStr(activity.date, 2);

    const rows = await prisma.dubLinkDaily.findMany({
      where: {
        shortLink,
        date: { gte: startDate, lte: endDate },
      },
      select: { clicks: true, leads: true },
    });

    const dubClicks = rows.reduce((s, r) => s + r.clicks, 0);
    const dubLeads = rows.reduce((s, r) => s + r.leads, 0);

    result.set(activity.id, { dubClicks, dubLeads, shortLink });
  }

  return result;
}

function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// LinkedIn Overview — Combined daily dataset
// ---------------------------------------------------------------------------

export interface LinkedInDailyRow {
  date: string;
  isWeekday: boolean;
  linkedinNau: number;
  linkedinSignups: number;
  adImpressions: number;
  adClicks: number;
  adSpend: number;
  empImpressions: number;
  empReactions: number;
  empPostCount: number;
  influencerImpressions: number;
  influencerSpend: number;
}

export interface LinkedInOverviewData {
  dailyData: LinkedInDailyRow[];
  baseline: { weekdayNau: number; weekendNau: number; weekdaySignups: number; weekendSignups: number };
  summary: {
    totalNau: number;
    totalSignups: number;
    incrementalNau: number;
    incrementalSignups: number;
    totalAdSpend: number;
    totalInfluencerSpend: number;
    totalPaidSpend: number;
    incrementalCpa: number | null;
  };
  employeeSummary: Array<{
    name: string;
    postCount: number;
    totalImpressions: number;
    totalReactions: number;
    totalComments: number;
    totalReposts: number;
  }>;
  influencerActivities: Array<{
    partnerName: string;
    date: string;
    activityType: string;
    actualClicks: number;
    costUsd: number;
    contentUrl: string | null;
  }>;
}

/**
 * Build a unified daily LinkedIn dataset combining ads, employee posts,
 * influencer activities, and survey-attributed outcomes.
 *
 * Employee & influencer post impressions are decayed over 3 days: 50/30/20%.
 * Baseline is computed from the pre-ads period (Sep 1 – Dec 15) using
 * weekday/weekend medians.
 */
export async function getLinkedInOverviewData(
  dateRange?: DateRange
): Promise<LinkedInOverviewData> {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = dateRange?.from ?? "2025-09-01";
  const endDate = dateRange?.to ?? today;

  // --- Fetch all data in parallel ---
  const [metrics, adDaily, empPosts, influencerActs] = await Promise.all([
    prisma.dailyMetric.findMany({
      where: { channel: "linkedin" },
      orderBy: { date: "asc" },
    }),
    prisma.linkedInAdDaily.findMany({
      orderBy: { date: "asc" },
    }),
    prisma.employeeLinkedInPost.findMany({
      where: { postDate: { gte: "2026-01-01" } },
      include: { account: { select: { linkedinName: true } } },
      orderBy: { postDate: "asc" },
    }),
    prisma.activity.findMany({
      where: { channel: "linkedin", status: "live" },
      orderBy: { date: "asc" },
    }),
  ]);

  // --- Build lookup maps ---
  const metricsMap = new Map<string, { signups: number; activations: number }>();
  for (const m of metrics) {
    metricsMap.set(m.date, { signups: m.signups, activations: m.activations });
  }

  // Ads: aggregate by date (sum across campaigns)
  const adsMap = new Map<string, { impressions: number; clicks: number; spend: number }>();
  for (const d of adDaily) {
    const existing = adsMap.get(d.date) ?? { impressions: 0, clicks: 0, spend: 0 };
    existing.impressions += d.impressions;
    existing.clicks += d.clicks;
    existing.spend += d.spend;
    adsMap.set(d.date, existing);
  }

  // Employee posts: decay 50/30/20 over 3 days
  const empDecay = new Map<string, { impressions: number; reactions: number; postCount: number }>();
  const decayWeights = [0.5, 0.3, 0.2];
  for (const post of empPosts) {
    // Raw post count only on post date
    const existing0 = empDecay.get(post.postDate) ?? { impressions: 0, reactions: 0, postCount: 0 };
    existing0.postCount++;
    empDecay.set(post.postDate, existing0);

    for (let i = 0; i < 3; i++) {
      const dayStr = addDaysStr(post.postDate, i);
      const existing = empDecay.get(dayStr) ?? { impressions: 0, reactions: 0, postCount: existing0.postCount };
      if (i > 0 && !empDecay.has(dayStr)) {
        existing.postCount = 0; // Only count raw posts on post date
      }
      existing.impressions += Math.round(post.impressions * decayWeights[i]);
      existing.reactions += Math.round(post.reactions * decayWeights[i]);
      empDecay.set(dayStr, existing);
    }
  }

  // Influencer activities: decay 50/30/20
  const influencerDecay = new Map<string, { impressions: number; spend: number }>();
  for (const act of influencerActs) {
    // metadata may be a JSON string or an object depending on Prisma's handling
    let meta: Record<string, number> = {};
    if (typeof act.metadata === "string") {
      try { meta = JSON.parse(act.metadata); } catch { /* ignore */ }
    } else if (act.metadata && typeof act.metadata === "object") {
      meta = act.metadata as Record<string, number>;
    }
    const impressions = act.actualClicks ?? meta.impressions ?? 0;
    const cost = act.costUsd ?? 0;
    for (let i = 0; i < 3; i++) {
      const dayStr = addDaysStr(act.date, i);
      const existing = influencerDecay.get(dayStr) ?? { impressions: 0, spend: 0 };
      existing.impressions += Math.round(impressions * decayWeights[i]);
      existing.spend += cost * decayWeights[i];
      influencerDecay.set(dayStr, existing);
    }
  }

  // --- Build daily rows ---
  const dailyData: LinkedInDailyRow[] = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const endD = new Date(endDate + "T00:00:00Z");

  while (cursor <= endD) {
    const ds = cursor.toISOString().slice(0, 10);
    const dow = cursor.getUTCDay();
    const isWeekday = dow >= 1 && dow <= 5;
    const met = metricsMap.get(ds);
    const ad = adsMap.get(ds);
    const emp = empDecay.get(ds);
    const inf = influencerDecay.get(ds);

    dailyData.push({
      date: ds,
      isWeekday,
      linkedinNau: met?.activations ?? 0,
      linkedinSignups: met?.signups ?? 0,
      adImpressions: ad?.impressions ?? 0,
      adClicks: ad?.clicks ?? 0,
      adSpend: ad?.spend ?? 0,
      empImpressions: emp?.impressions ?? 0,
      empReactions: emp?.reactions ?? 0,
      empPostCount: emp?.postCount ?? 0,
      influencerImpressions: inf?.impressions ?? 0,
      influencerSpend: inf?.spend ?? 0,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // --- Compute baseline from pre-ads period (Sep 1 – Dec 15) ---
  const baselineDays: LinkedInDailyRow[] = [];
  const bCursor = new Date("2025-09-01T00:00:00Z");
  const bEnd = new Date("2025-12-15T00:00:00Z");
  while (bCursor <= bEnd) {
    const ds = bCursor.toISOString().slice(0, 10);
    const dow = bCursor.getUTCDay();
    const met = metricsMap.get(ds);
    baselineDays.push({
      date: ds,
      isWeekday: dow >= 1 && dow <= 5,
      linkedinNau: met?.activations ?? 0,
      linkedinSignups: met?.signups ?? 0,
      adImpressions: 0, adClicks: 0, adSpend: 0,
      empImpressions: 0, empReactions: 0, empPostCount: 0,
      influencerImpressions: 0, influencerSpend: 0,
    });
    bCursor.setUTCDate(bCursor.getUTCDate() + 1);
  }

  function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  const bWD = baselineDays.filter(d => d.isWeekday);
  const bWE = baselineDays.filter(d => !d.isWeekday);
  const baseline = {
    weekdayNau: median(bWD.map(d => d.linkedinNau)),
    weekendNau: median(bWE.map(d => d.linkedinNau)),
    weekdaySignups: median(bWD.map(d => d.linkedinSignups)),
    weekendSignups: median(bWE.map(d => d.linkedinSignups)),
  };

  // --- Portfolio incremental (from Dec 16 onwards, or from first ad day) ---
  const paidPeriod = dailyData.filter(d => d.date >= "2025-12-16");
  const ppWD = paidPeriod.filter(d => d.isWeekday);
  const ppWE = paidPeriod.filter(d => !d.isWeekday);
  const totalNau = paidPeriod.reduce((s, d) => s + d.linkedinNau, 0);
  const totalSignups = paidPeriod.reduce((s, d) => s + d.linkedinSignups, 0);
  const expectedNau = baseline.weekdayNau * ppWD.length + baseline.weekendNau * ppWE.length;
  const expectedSignups = baseline.weekdaySignups * ppWD.length + baseline.weekendSignups * ppWE.length;
  const incrementalNau = Math.round(totalNau - expectedNau);
  const incrementalSignups = Math.round(totalSignups - expectedSignups);

  const totalAdSpend = paidPeriod.reduce((s, d) => s + d.adSpend, 0);
  const totalInfluencerSpend = influencerActs.reduce((s, a) => s + (a.costUsd ?? 0), 0);
  const totalPaidSpend = totalAdSpend + totalInfluencerSpend;

  // --- Employee summary by person ---
  const empByPerson = new Map<string, { count: number; imp: number; react: number; comments: number; reposts: number }>();
  for (const post of empPosts) {
    const name = post.account.linkedinName || "Unknown";
    const e = empByPerson.get(name) ?? { count: 0, imp: 0, react: 0, comments: 0, reposts: 0 };
    e.count++;
    e.imp += post.impressions;
    e.react += post.reactions;
    e.comments += post.comments;
    e.reposts += post.reposts;
    empByPerson.set(name, e);
  }

  const employeeSummary = Array.from(empByPerson.entries())
    .map(([name, v]) => ({
      name,
      postCount: v.count,
      totalImpressions: v.imp,
      totalReactions: v.react,
      totalComments: v.comments,
      totalReposts: v.reposts,
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions);

  return {
    dailyData,
    baseline,
    summary: {
      totalNau,
      totalSignups,
      incrementalNau,
      incrementalSignups,
      totalAdSpend,
      totalInfluencerSpend,
      totalPaidSpend,
      incrementalCpa: incrementalNau > 0 ? totalPaidSpend / incrementalNau : null,
    },
    employeeSummary,
    influencerActivities: influencerActs.map(a => ({
      partnerName: a.partnerName,
      date: a.date,
      activityType: a.activityType,
      actualClicks: a.actualClicks ?? 0,
      costUsd: a.costUsd ?? 0,
      contentUrl: a.contentUrl,
    })),
  };
}
