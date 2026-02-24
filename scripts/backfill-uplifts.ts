/**
 * One-time backfill script: compute attributed uplift for all existing
 * activities and write to activity_uplifts table.
 *
 * Usage:
 *   DATABASE_URL=<neon_url> npx tsx scripts/backfill-uplifts.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  computeAllReports,
  getConfig,
  applyProportionalAttribution,
} from "@mai/core";
import type { Activity, DailyMetric } from "@mai/core";

const prisma = new PrismaClient();

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
    } catch {}
  }
  return { ...row, metadata };
}

function toDailyMetric(row: {
  date: string;
  channel: string;
  signups: number;
  activations: number;
}): DailyMetric {
  return row;
}

async function main() {
  const startedAt = Date.now();

  const [activityRows, metricRows] = await Promise.all([
    prisma.activity.findMany({ orderBy: { date: "asc" } }),
    prisma.dailyMetric.findMany({ orderBy: { date: "asc" } }),
  ]);

  console.log(
    `Loaded ${activityRows.length} activities, ${metricRows.length} metric rows`
  );

  const activities = activityRows.map(toActivity);
  const allMetrics = metricRows.map(toDailyMetric);
  const config = getConfig();

  const metricsByChannel = new Map<string, DailyMetric[]>();
  const activitiesByChannel = new Map<string, Activity[]>();

  for (const m of allMetrics) {
    if (!metricsByChannel.has(m.channel)) metricsByChannel.set(m.channel, []);
    metricsByChannel.get(m.channel)!.push(m);
  }
  for (const a of activities) {
    if (!activitiesByChannel.has(a.channel))
      activitiesByChannel.set(a.channel, []);
    activitiesByChannel.get(a.channel)!.push(a);
  }

  const allReports = [];
  for (const [channel, channelActivities] of activitiesByChannel) {
    const channelMetrics = metricsByChannel.get(channel) ?? [];
    console.log(
      `  Computing ${channel}: ${channelActivities.length} activities`
    );
    const channelReports = computeAllReports(
      channelActivities,
      channelMetrics,
      config
    );
    allReports.push(...channelReports);
  }

  console.log(`Applying proportional attribution...`);
  const finalReports = config.postWindowAttribution?.enabled
    ? applyProportionalAttribution(
        allReports,
        allMetrics,
        config.postWindowAttribution
      )
    : allReports;

  console.log(`Writing ${finalReports.length} uplift records...`);
  await prisma.activityUplift.deleteMany();

  await prisma.activityUplift.createMany({
    data: finalReports.map((report) => {
      const attr = report.postWindowAttribution;
      return {
        activityId: report.activity.id,
        baselineWindowStart: report.baselineWindowStart,
        baselineWindowEnd: report.baselineWindowEnd,
        baselineAvg: report.baselineAvg,
        rawIncrementalSignups: attr?.rawIncrementalSignups ?? report.incremental,
        rawIncrementalActivations:
          attr?.rawIncremental ?? report.incrementalActivations,
        attributedIncrementalSignups:
          attr?.attributedIncrementalSignups ?? report.incremental,
        attributedIncrementalActivations:
          attr?.attributedIncremental ?? report.incrementalActivations,
        clicksUsed: attr?.clicksUsed ?? null,
        clicksSource: attr?.clicksSource ?? null,
        confidence: report.confidence,
        confidenceExplanation: report.confidenceExplanation,
        dailySharesJson: attr?.dailyShares
          ? JSON.stringify(attr.dailyShares)
          : null,
        dailyDataJson: report.dailyData
          ? JSON.stringify(report.dailyData)
          : null,
      };
    }),
  });

  const elapsed = Date.now() - startedAt;
  console.log(`✅ Backfilled ${finalReports.length} activity uplifts in ${elapsed}ms`);

  // Sanity check — newsletter attributed incremental NAU total
  const nlResult = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COALESCE(SUM(au.attributed_incremental_activations), 0) as total
    FROM activity_uplifts au
    JOIN activities a ON a.id = au.activity_id
    WHERE a.channel = 'newsletter' AND a.status = 'live'
  `;
  console.log(
    `\nSanity check — newsletter attributed incremental NAU: ${Math.round(Number(nlResult[0].total))}`
  );
  console.log(`(Expected: ~1,000 — matching the newsletter analytics page)`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
