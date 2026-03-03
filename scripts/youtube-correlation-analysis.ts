/**
 * YouTube Views ↔ User Acquisition Correlation Analysis
 *
 * Analyses the relationship between YouTube video views and
 * YouTube-attributed account creation / NAU.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    denX = 0,
    denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function spearman(x: number[], y: number[]): number {
  function rank(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    for (let i = 0; i < sorted.length; ) {
      let j = i;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const avgRank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) ranks[sorted[k].i] = avgRank;
      i = j;
    }
    return ranks;
  }
  return pearson(rank(x), rank(y));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(80));
  console.log("YOUTUBE VIEWS ↔ USER ACQUISITION CORRELATION ANALYSIS");
  console.log("=".repeat(80));

  // ── 1. Fetch data ───────────────────────────────────────────────────────────
  const [allViews, metricRows, videos, activities] = await Promise.all([
    prisma.importedVideoView.findMany({ orderBy: { date: "asc" } }),
    prisma.dailyMetric.findMany({
      where: { channel: "youtube" },
      orderBy: { date: "asc" },
    }),
    prisma.importedYouTubeVideo.findMany({ where: { status: "active" } }),
    prisma.activity.findMany({
      where: { channel: "youtube" },
      orderBy: { date: "asc" },
    }),
  ]);

  console.log(`\nData loaded:`);
  console.log(`  ImportedVideoView records: ${allViews.length}`);
  console.log(`  DailyMetric (youtube) records: ${metricRows.length}`);
  console.log(`  Active imported videos: ${videos.length}`);
  console.log(`  YouTube activities (paid): ${activities.length}`);

  // Build video lookup
  const videoById = new Map(videos.map((v) => [v.id, v]));

  // ── 2. Compute per-video daily increments ───────────────────────────────────
  const viewsByVideo = new Map<
    string,
    { date: string; viewCount: number }[]
  >();
  for (const v of allViews) {
    if (!viewsByVideo.has(v.videoId)) viewsByVideo.set(v.videoId, []);
    viewsByVideo.get(v.videoId)!.push({ date: v.date, viewCount: v.viewCount });
  }

  // Per-video increments (skip first tracked day)
  const videoIncrements = new Map<
    string,
    { date: string; increment: number }[]
  >();
  const dailyTotalIncrements = new Map<string, number>();

  for (const [videoId, views] of viewsByVideo) {
    views.sort((a, b) => a.date.localeCompare(b.date));
    const increments: { date: string; increment: number }[] = [];
    for (let i = 1; i < views.length; i++) {
      const diff = views[i].viewCount - views[i - 1].viewCount;
      if (diff >= 0) {
        increments.push({ date: views[i].date, increment: diff });
        dailyTotalIncrements.set(
          views[i].date,
          (dailyTotalIncrements.get(views[i].date) ?? 0) + diff
        );
      }
    }
    videoIncrements.set(videoId, increments);
  }

  // Daily metrics lookup
  const metricsByDate = new Map<
    string,
    { signups: number; activations: number }
  >();
  for (const m of metricRows) {
    const existing = metricsByDate.get(m.date) ?? {
      signups: 0,
      activations: 0,
    };
    metricsByDate.set(m.date, {
      signups: existing.signups + m.signups,
      activations: existing.activations + m.activations,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ANALYSIS 1: Aggregate time-series correlation
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("ANALYSIS 1: AGGREGATE TIME-SERIES CORRELATION");
  console.log("=".repeat(80));

  // Build aligned daily series
  const allDates = new Set([
    ...dailyTotalIncrements.keys(),
    ...metricsByDate.keys(),
  ]);
  const sortedDates = Array.from(allDates).sort();

  // Show date range
  console.log(
    `\nDate range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]} (${sortedDates.length} days)`
  );

  // Correlation at different lags (views lead signups by N days)
  console.log("\n--- Daily correlation (Pearson / Spearman) ---");
  console.log("Lag = views lead signups by N days\n");

  for (let lag = 0; lag <= 7; lag++) {
    const viewsArr: number[] = [];
    const signupsArr: number[] = [];
    const activationsArr: number[] = [];

    for (let i = 0; i < sortedDates.length - lag; i++) {
      const viewDate = sortedDates[i];
      const metricDate = sortedDates[i + lag];
      const views = dailyTotalIncrements.get(viewDate) ?? 0;
      const metrics = metricsByDate.get(metricDate) ?? {
        signups: 0,
        activations: 0,
      };
      viewsArr.push(views);
      signupsArr.push(metrics.signups);
      activationsArr.push(metrics.activations);
    }

    const pSignups = pearson(viewsArr, signupsArr).toFixed(3);
    const sSignups = spearman(viewsArr, signupsArr).toFixed(3);
    const pActivations = pearson(viewsArr, activationsArr).toFixed(3);
    const sActivations = spearman(viewsArr, activationsArr).toFixed(3);

    console.log(
      `  Lag ${lag}d: Signups r=${pSignups} ρ=${sSignups}  |  NAU r=${pActivations} ρ=${sActivations}`
    );
  }

  // Weekly correlation (smoother signal)
  console.log("\n--- Weekly correlation ---\n");

  const weeklyViews = new Map<string, number>();
  const weeklySignups = new Map<string, number>();
  const weeklyActivations = new Map<string, number>();

  for (const [date, inc] of dailyTotalIncrements) {
    const week = getWeekKey(date);
    weeklyViews.set(week, (weeklyViews.get(week) ?? 0) + inc);
  }
  for (const [date, metrics] of metricsByDate) {
    const week = getWeekKey(date);
    weeklySignups.set(week, (weeklySignups.get(week) ?? 0) + metrics.signups);
    weeklyActivations.set(
      week,
      (weeklyActivations.get(week) ?? 0) + metrics.activations
    );
  }

  const allWeeks = Array.from(
    new Set([
      ...weeklyViews.keys(),
      ...weeklySignups.keys(),
    ])
  ).sort();

  const wViews = allWeeks.map((w) => weeklyViews.get(w) ?? 0);
  const wSignups = allWeeks.map((w) => weeklySignups.get(w) ?? 0);
  const wActivations = allWeeks.map((w) => weeklyActivations.get(w) ?? 0);

  console.log(`  Weeks: ${allWeeks.length}`);
  console.log(
    `  Views↔Signups:      Pearson r=${pearson(wViews, wSignups).toFixed(3)}  Spearman ρ=${spearman(wViews, wSignups).toFixed(3)}`
  );
  console.log(
    `  Views↔NAU:          Pearson r=${pearson(wViews, wActivations).toFixed(3)}  Spearman ρ=${spearman(wViews, wActivations).toFixed(3)}`
  );

  // Print weekly data
  console.log("\n--- Weekly data table ---\n");
  console.log("  Week         Views    Signups    NAU");
  console.log("  " + "-".repeat(42));
  for (const week of allWeeks) {
    const v = weeklyViews.get(week) ?? 0;
    const s = weeklySignups.get(week) ?? 0;
    const a = weeklyActivations.get(week) ?? 0;
    console.log(
      `  ${week}    ${String(v).padStart(7)}    ${String(s).padStart(7)}    ${String(a).padStart(5)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ANALYSIS 2: Per-video & per-channel view-share attribution
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("ANALYSIS 2: VIEW-SHARE ATTRIBUTION — PER-VIDEO CONVERSION RATES");
  console.log("=".repeat(80));

  // For each day, attribute signups proportionally to each video's view share
  const videoAttributedSignups = new Map<string, number>();
  const videoAttributedActivations = new Map<string, number>();
  const videoTotalIncrementalViews = new Map<string, number>();

  for (const date of sortedDates) {
    const totalViews = dailyTotalIncrements.get(date) ?? 0;
    const metrics = metricsByDate.get(date) ?? { signups: 0, activations: 0 };
    if (totalViews === 0 || (metrics.signups === 0 && metrics.activations === 0))
      continue;

    // Find each video's share of views on this date
    for (const [videoId, increments] of videoIncrements) {
      const dayInc = increments.find((inc) => inc.date === date);
      if (!dayInc || dayInc.increment === 0) continue;

      const share = dayInc.increment / totalViews;
      videoAttributedSignups.set(
        videoId,
        (videoAttributedSignups.get(videoId) ?? 0) + metrics.signups * share
      );
      videoAttributedActivations.set(
        videoId,
        (videoAttributedActivations.get(videoId) ?? 0) +
          metrics.activations * share
      );
    }
  }

  // Total incremental views per video
  for (const [videoId, increments] of videoIncrements) {
    const total = increments.reduce((sum, inc) => sum + inc.increment, 0);
    videoTotalIncrementalViews.set(videoId, total);
  }

  // Build ranked list
  interface VideoAnalysis {
    videoId: string;
    title: string;
    channelTitle: string;
    source: string;
    totalIncrementalViews: number;
    attributedSignups: number;
    attributedActivations: number;
    signupsPerKViews: number;
    activationsPerKViews: number;
  }

  const videoAnalyses: VideoAnalysis[] = [];
  for (const [videoId, totalViews] of videoTotalIncrementalViews) {
    if (totalViews < 50) continue; // skip very low-view videos
    const video = videoById.get(videoId);
    if (!video) continue;

    const attSignups = videoAttributedSignups.get(videoId) ?? 0;
    const attActivations = videoAttributedActivations.get(videoId) ?? 0;

    videoAnalyses.push({
      videoId,
      title: video.title,
      channelTitle: video.channelTitle,
      source: video.source,
      totalIncrementalViews: totalViews,
      attributedSignups: attSignups,
      attributedActivations: attActivations,
      signupsPerKViews: totalViews > 0 ? (attSignups / totalViews) * 1000 : 0,
      activationsPerKViews:
        totalViews > 0 ? (attActivations / totalViews) * 1000 : 0,
    });
  }

  // Sort by attributed signups (most impactful first)
  videoAnalyses.sort((a, b) => b.attributedSignups - a.attributedSignups);

  console.log(
    `\nVideos with ≥50 incremental views: ${videoAnalyses.length}`
  );
  console.log(
    `\n--- Top 25 videos by attributed signups ---\n`
  );
  console.log(
    `${"#".padStart(3)}  ${"Title".padEnd(50)}  ${"Channel".padEnd(25)}  ${"Src".padEnd(5)}  ${"Views".padStart(8)}  ${"Signups".padStart(8)}  ${"NAU".padStart(6)}  ${"S/kV".padStart(6)}  ${"N/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(130));

  for (let i = 0; i < Math.min(25, videoAnalyses.length); i++) {
    const v = videoAnalyses[i];
    console.log(
      `${String(i + 1).padStart(3)}  ${v.title.slice(0, 50).padEnd(50)}  ${v.channelTitle.slice(0, 25).padEnd(25)}  ${v.source === "paid_sponsorship" ? "PAID" : "org "}   ${String(v.totalIncrementalViews).padStart(7)}  ${v.attributedSignups.toFixed(1).padStart(8)}  ${v.attributedActivations.toFixed(1).padStart(6)}  ${v.signupsPerKViews.toFixed(1).padStart(6)}  ${v.activationsPerKViews.toFixed(1).padStart(6)}`
    );
  }

  // Sort by conversion rate (signups per 1000 views) — minimum 200 views
  const highConversion = videoAnalyses
    .filter((v) => v.totalIncrementalViews >= 200)
    .sort((a, b) => b.signupsPerKViews - a.signupsPerKViews);

  console.log(
    `\n--- Top 25 videos by conversion rate (signups per 1000 views, min 200 views) ---\n`
  );
  console.log(
    `${"#".padStart(3)}  ${"Title".padEnd(50)}  ${"Channel".padEnd(25)}  ${"Src".padEnd(5)}  ${"Views".padStart(8)}  ${"Signups".padStart(8)}  ${"S/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(115));

  for (let i = 0; i < Math.min(25, highConversion.length); i++) {
    const v = highConversion[i];
    console.log(
      `${String(i + 1).padStart(3)}  ${v.title.slice(0, 50).padEnd(50)}  ${v.channelTitle.slice(0, 25).padEnd(25)}  ${v.source === "paid_sponsorship" ? "PAID" : "org "}   ${String(v.totalIncrementalViews).padStart(7)}  ${v.attributedSignups.toFixed(1).padStart(8)}  ${v.signupsPerKViews.toFixed(1).padStart(6)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ANALYSIS 3: Per-channel aggregation
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("ANALYSIS 3: PER-CHANNEL (PUBLISHER) CONVERSION RATES");
  console.log("=".repeat(80));

  const channelStats = new Map<
    string,
    {
      videoCount: number;
      paidCount: number;
      totalViews: number;
      attSignups: number;
      attActivations: number;
    }
  >();

  for (const v of videoAnalyses) {
    const existing = channelStats.get(v.channelTitle) ?? {
      videoCount: 0,
      paidCount: 0,
      totalViews: 0,
      attSignups: 0,
      attActivations: 0,
    };
    existing.videoCount++;
    if (v.source === "paid_sponsorship") existing.paidCount++;
    existing.totalViews += v.totalIncrementalViews;
    existing.attSignups += v.attributedSignups;
    existing.attActivations += v.attributedActivations;
    channelStats.set(v.channelTitle, existing);
  }

  const channelRanking = Array.from(channelStats.entries())
    .map(([channel, stats]) => ({
      channel,
      ...stats,
      signupsPerKViews:
        stats.totalViews > 0
          ? (stats.attSignups / stats.totalViews) * 1000
          : 0,
      activationsPerKViews:
        stats.totalViews > 0
          ? (stats.attActivations / stats.totalViews) * 1000
          : 0,
    }))
    .sort((a, b) => b.attSignups - a.attSignups);

  console.log(
    `\n--- Channels ranked by attributed signups ---\n`
  );
  console.log(
    `${"#".padStart(3)}  ${"Channel".padEnd(35)}  ${"Vids".padStart(4)}  ${"Paid".padStart(4)}  ${"Views".padStart(8)}  ${"Signups".padStart(8)}  ${"NAU".padStart(6)}  ${"S/kV".padStart(6)}  ${"N/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(95));

  for (let i = 0; i < Math.min(30, channelRanking.length); i++) {
    const c = channelRanking[i];
    console.log(
      `${String(i + 1).padStart(3)}  ${c.channel.slice(0, 35).padEnd(35)}  ${String(c.videoCount).padStart(4)}  ${String(c.paidCount).padStart(4)}  ${String(c.totalViews).padStart(8)}  ${c.attSignups.toFixed(1).padStart(8)}  ${c.attActivations.toFixed(1).padStart(6)}  ${c.signupsPerKViews.toFixed(1).padStart(6)}  ${c.activationsPerKViews.toFixed(1).padStart(6)}`
    );
  }

  // Channels by conversion rate (min 500 views)
  const channelByConversion = channelRanking
    .filter((c) => c.totalViews >= 500)
    .sort((a, b) => b.signupsPerKViews - a.signupsPerKViews);

  console.log(
    `\n--- Channels ranked by conversion rate (S/kV, min 500 views) ---\n`
  );
  console.log(
    `${"#".padStart(3)}  ${"Channel".padEnd(35)}  ${"Vids".padStart(4)}  ${"Views".padStart(8)}  ${"Signups".padStart(8)}  ${"S/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(72));

  for (let i = 0; i < Math.min(20, channelByConversion.length); i++) {
    const c = channelByConversion[i];
    console.log(
      `${String(i + 1).padStart(3)}  ${c.channel.slice(0, 35).padEnd(35)}  ${String(c.videoCount).padStart(4)}  ${String(c.totalViews).padStart(8)}  ${c.attSignups.toFixed(1).padStart(8)}  ${c.signupsPerKViews.toFixed(1).padStart(6)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ANALYSIS 4: Paid sponsorship validation
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("ANALYSIS 4: PAID SPONSORSHIP VALIDATION");
  console.log("=".repeat(80));

  const paidVideos = videoAnalyses.filter(
    (v) => v.source === "paid_sponsorship"
  );
  const organicVideos = videoAnalyses.filter(
    (v) => v.source !== "paid_sponsorship"
  );

  const paidTotalViews = paidVideos.reduce(
    (s, v) => s + v.totalIncrementalViews,
    0
  );
  const paidTotalSignups = paidVideos.reduce(
    (s, v) => s + v.attributedSignups,
    0
  );
  const paidTotalActivations = paidVideos.reduce(
    (s, v) => s + v.attributedActivations,
    0
  );

  const organicTotalViews = organicVideos.reduce(
    (s, v) => s + v.totalIncrementalViews,
    0
  );
  const organicTotalSignups = organicVideos.reduce(
    (s, v) => s + v.attributedSignups,
    0
  );
  const organicTotalActivations = organicVideos.reduce(
    (s, v) => s + v.attributedActivations,
    0
  );

  console.log(
    `\n--- Paid vs Organic comparison ---\n`
  );
  console.log(
    `  Paid sponsorships:  ${paidVideos.length} videos, ${paidTotalViews.toLocaleString()} views, ${paidTotalSignups.toFixed(1)} signups, ${paidTotalActivations.toFixed(1)} NAU`
  );
  console.log(
    `    Conversion: ${paidTotalViews > 0 ? ((paidTotalSignups / paidTotalViews) * 1000).toFixed(1) : "N/A"} signups/kV, ${paidTotalViews > 0 ? ((paidTotalActivations / paidTotalViews) * 1000).toFixed(1) : "N/A"} NAU/kV`
  );
  console.log(
    `\n  Organic:            ${organicVideos.length} videos, ${organicTotalViews.toLocaleString()} views, ${organicTotalSignups.toFixed(1)} signups, ${organicTotalActivations.toFixed(1)} NAU`
  );
  console.log(
    `    Conversion: ${organicTotalViews > 0 ? ((organicTotalSignups / organicTotalViews) * 1000).toFixed(1) : "N/A"} signups/kV, ${organicTotalViews > 0 ? ((organicTotalActivations / organicTotalViews) * 1000).toFixed(1) : "N/A"} NAU/kV`
  );

  // Individual paid videos
  console.log(`\n--- Individual paid sponsorship videos ---\n`);

  // Also look up activity data for cost
  const activityByContentUrl = new Map<string, typeof activities[0]>();
  for (const a of activities) {
    if (a.contentUrl) activityByContentUrl.set(a.contentUrl, a);
  }

  for (const v of paidVideos.sort(
    (a, b) => b.totalIncrementalViews - a.totalIncrementalViews
  )) {
    const video = videoById.get(v.videoId);
    const matchingActivity = activities.find(
      (a) => a.contentUrl && a.contentUrl.includes(video?.videoId ?? "___")
    );
    const cost = matchingActivity?.costUsd;

    console.log(`  "${v.title.slice(0, 60)}"`);
    console.log(`    Channel: ${v.channelTitle}`);
    console.log(
      `    Views: ${v.totalIncrementalViews.toLocaleString()}  |  Signups: ${v.attributedSignups.toFixed(1)}  |  NAU: ${v.attributedActivations.toFixed(1)}`
    );
    console.log(
      `    S/kV: ${v.signupsPerKViews.toFixed(1)}  |  N/kV: ${v.activationsPerKViews.toFixed(1)}`
    );
    if (cost) {
      console.log(
        `    Cost: $${cost}  |  CPA (signup): $${v.attributedSignups > 0 ? (cost / v.attributedSignups).toFixed(0) : "N/A"}  |  CPA (NAU): $${v.attributedActivations > 0 ? (cost / v.attributedActivations).toFixed(0) : "N/A"}`
      );
    }
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ANALYSIS 5: Summary statistics
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  const totalIncViews = videoAnalyses.reduce(
    (s, v) => s + v.totalIncrementalViews,
    0
  );
  const totalAttSignups = videoAnalyses.reduce(
    (s, v) => s + v.attributedSignups,
    0
  );
  const totalAttActivations = videoAnalyses.reduce(
    (s, v) => s + v.attributedActivations,
    0
  );

  console.log(`\n  Total incremental views tracked: ${totalIncViews.toLocaleString()}`);
  console.log(`  Total attributed signups: ${totalAttSignups.toFixed(1)}`);
  console.log(`  Total attributed NAU: ${totalAttActivations.toFixed(1)}`);
  console.log(
    `  Overall conversion: ${((totalAttSignups / totalIncViews) * 1000).toFixed(1)} signups / 1000 views`
  );
  console.log(
    `  Overall activation: ${((totalAttActivations / totalIncViews) * 1000).toFixed(1)} NAU / 1000 views`
  );

  // Views distribution
  const viewBuckets = [
    { label: "0-100 views", min: 0, max: 100 },
    { label: "100-500 views", min: 100, max: 500 },
    { label: "500-2k views", min: 500, max: 2000 },
    { label: "2k-10k views", min: 2000, max: 10000 },
    { label: "10k-50k views", min: 10000, max: 50000 },
    { label: "50k+ views", min: 50000, max: Infinity },
  ];

  console.log(`\n--- Conversion by view bucket ---\n`);
  console.log(
    `  ${"Bucket".padEnd(16)}  ${"Videos".padStart(6)}  ${"Views".padStart(10)}  ${"Signups".padStart(8)}  ${"S/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(52));

  for (const bucket of viewBuckets) {
    const bucketVideos = videoAnalyses.filter(
      (v) =>
        v.totalIncrementalViews >= bucket.min &&
        v.totalIncrementalViews < bucket.max
    );
    const bViews = bucketVideos.reduce(
      (s, v) => s + v.totalIncrementalViews,
      0
    );
    const bSignups = bucketVideos.reduce(
      (s, v) => s + v.attributedSignups,
      0
    );
    const sPerKV = bViews > 0 ? (bSignups / bViews) * 1000 : 0;
    console.log(
      `  ${bucket.label.padEnd(16)}  ${String(bucketVideos.length).padStart(6)}  ${bViews.toLocaleString().padStart(10)}  ${bSignups.toFixed(1).padStart(8)}  ${sPerKV.toFixed(1).padStart(6)}`
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
