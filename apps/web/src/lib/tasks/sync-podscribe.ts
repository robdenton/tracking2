/**
 * Podscribe Sync Task
 *
 * Fetches podcast impression data from the Podscribe API and upserts:
 *   1. PodscribeCampaign records (keyed by Campaign Internal ID)
 *   2. PodscribeCampaignDaily records (keyed by campaign + date)
 *   3. Activity records for each campaign (channel: "podcast")
 */

import { prisma } from "../prisma";
import { fetchImpressionsByDay, PodscribeRow } from "../podscribe";
import { createHash } from "crypto";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [Podscribe Sync] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] [Podscribe Sync] ERROR: ${msg}`);
}

/** Generate a deterministic Activity ID from channel + partnerName + date */
function deterministicActivityId(
  channel: string,
  partnerName: string,
  date: string
): string {
  const hash = createHash("sha256")
    .update(`${channel}::${partnerName}::${date}`)
    .digest("hex");
  // UUID-like: 8-4-4-4-12
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

interface Flight {
  date: string; // air date for this flight
  startDate: string;
  endDate: string;
  impressions: number;
  spend: number;
  visitors: number;
  visits: number;
}

/**
 * Split a campaign into separate flights based on distinct episode publish dates.
 * Uses the publishDate from raw rows to detect when the same campaign covers
 * multiple separate episodes (e.g., Good Guys on Feb 23 AND Mar 19).
 *
 * For DAI campaigns without episode data, falls back to a single flight.
 * Daily impressions are attributed to the nearest preceding episode.
 */
function splitIntoFlights(agg: CampaignAgg): Flight[] {
  // Get unique episode publish dates (non-empty)
  const publishDates = [
    ...new Set(
      agg.dailyRows
        .map((r) => r.publishDate)
        .filter((d) => d && d.length >= 10)
    ),
  ].sort();

  // If 0 or 1 publish dates, single flight
  if (publishDates.length <= 1) {
    const activityDate =
      publishDates[0] ||
      (agg.type?.toLowerCase() === "dai"
        ? agg.startDate
        : agg.expectedDate || agg.startDate);
    if (!activityDate) return [];
    return [
      {
        date: activityDate,
        startDate: agg.startDate,
        endDate: agg.endDate,
        impressions: agg.totalImpressions,
        spend: agg.totalSpend,
        visitors: agg.totalVisitors,
        visits: agg.totalVisits,
      },
    ];
  }

  log(
    `  Campaign "${agg.show}" has ${publishDates.length} episodes: ${publishDates.join(", ")}`
  );

  // Group daily rows by their episode publish date
  const flightMap = new Map<
    string,
    { impressions: number; spend: number; visitors: number; visits: number; days: string[] }
  >();

  for (const pubDate of publishDates) {
    flightMap.set(pubDate, { impressions: 0, spend: 0, visitors: 0, visits: 0, days: [] });
  }

  // Rows WITH a publish date go to that episode
  // Rows WITHOUT a publish date (aggregated/summary rows) — attribute to nearest episode by date
  for (const row of agg.dailyRows) {
    if (row.impressions === 0 && row.visitors === 0) continue;

    let targetDate: string;
    if (row.publishDate && flightMap.has(row.publishDate)) {
      targetDate = row.publishDate;
    } else {
      // Find the nearest episode that aired on or before this day
      targetDate = publishDates[0];
      for (const pd of publishDates) {
        if (pd <= row.day) targetDate = pd;
      }
    }

    const flight = flightMap.get(targetDate)!;
    flight.impressions += row.impressions;
    flight.spend += row.spend;
    flight.visitors += row.visitors;
    flight.visits += row.visits;
    flight.days.push(row.day);
  }

  // Build flights
  return publishDates.map((pubDate) => {
    const data = flightMap.get(pubDate)!;
    const sortedDays = data.days.sort();

    // If spend is 0 on daily rows but campaign has total spend, distribute proportionally
    const flightSpend =
      data.spend > 0
        ? data.spend
        : agg.totalImpressions > 0
          ? (data.impressions / agg.totalImpressions) * agg.totalSpend
          : agg.totalSpend / publishDates.length;

    return {
      date: pubDate,
      startDate: sortedDays[0] || pubDate,
      endDate: sortedDays[sortedDays.length - 1] || pubDate,
      impressions: data.impressions,
      spend: flightSpend,
      visitors: data.visitors,
      visits: data.visits,
    };
  });
}

interface CampaignAgg {
  campaignInternalId: string;
  name: string;
  publisher: string;
  show: string;
  type: string;
  tags: string;
  expectedDate: string;
  startDate: string;
  endDate: string;
  totalSpend: number;
  totalImpressions: number;
  totalVisitors: number;
  totalVisits: number;
  dailyRows: {
    day: string;
    impressions: number;
    reach: number;
    spend: number;
    visitors: number;
    visits: number;
    publishDate: string;
  }[];
}

export async function syncPodscribe(): Promise<{
  campaigns: number;
  dailyRows: number;
  activities: number;
  errors: number;
  errorDetail?: string;
}> {
  let campaignCount = 0;
  let dailyRowCount = 0;
  let activityCount = 0;
  let errors = 0;

  // Clean up stale Podscribe activities before recreating
  // (flight splitting may change which activities exist)
  const deleted = await prisma.activity.deleteMany({
    where: { source: "podscribe", channel: "podcast" },
  });
  log(`Cleaned up ${deleted.count} existing Podscribe activities`);

  // Determine date range: last 90 days to capture all flights
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  log(`Fetching Podscribe data ${fmt(startDate)} → ${fmt(endDate)}...`);

  let rows: PodscribeRow[];
  try {
    rows = await fetchImpressionsByDay(fmt(startDate), fmt(endDate));
    log(`Received ${rows.length} rows from Podscribe`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Failed to fetch Podscribe data: ${msg}`);
    return {
      campaigns: 0,
      dailyRows: 0,
      activities: 0,
      errors: 1,
      errorDetail: msg,
    };
  }

  // Group rows by Campaign Internal ID
  const campaignMap = new Map<string, CampaignAgg>();
  for (const row of rows) {
    if (!row.campaignInternalId) continue;

    let agg = campaignMap.get(row.campaignInternalId);
    if (!agg) {
      agg = {
        campaignInternalId: row.campaignInternalId,
        name: row.campaign,
        publisher: row.publisher,
        show: row.show,
        type: row.type,
        tags: row.tags,
        expectedDate: row.expectedDate,
        startDate: row.startDate,
        endDate: row.endDate,
        totalSpend: 0,
        totalImpressions: 0,
        totalVisitors: 0,
        totalVisits: 0,
        dailyRows: [],
      };
      campaignMap.set(row.campaignInternalId, agg);
    }

    agg.totalSpend += row.spend;
    agg.totalImpressions += row.impressions;
    agg.totalVisitors += row.visitors;
    agg.totalVisits += row.visits;
    agg.dailyRows.push({
      day: row.day,
      impressions: row.impressions,
      reach: row.reach,
      spend: row.spend,
      visitors: row.visitors,
      visits: row.visits,
      publishDate: row.publishDate,
    });
  }

  log(`Grouped into ${campaignMap.size} campaigns`);

  // Upsert campaigns and daily stats
  for (const agg of campaignMap.values()) {
    try {
      // Upsert campaign
      const campaign = await prisma.podscribeCampaign.upsert({
        where: { campaignId: agg.campaignInternalId },
        create: {
          campaignId: agg.campaignInternalId,
          name: agg.name,
          publisher: agg.publisher,
          show: agg.show,
          type: agg.type || null,
          tags: agg.tags || null,
          startDate: agg.startDate || null,
          expectedDate: agg.expectedDate || null,
          endDate: agg.endDate || null,
          totalSpend: agg.totalSpend,
          totalImpressions: agg.totalImpressions,
        },
        update: {
          name: agg.name,
          publisher: agg.publisher,
          show: agg.show,
          type: agg.type || null,
          tags: agg.tags || null,
          startDate: agg.startDate || null,
          expectedDate: agg.expectedDate || null,
          endDate: agg.endDate || null,
          totalSpend: agg.totalSpend,
          totalImpressions: agg.totalImpressions,
        },
      });
      campaignCount++;

      // Upsert daily stats
      for (const daily of agg.dailyRows) {
        try {
          await prisma.podscribeCampaignDaily.upsert({
            where: {
              campaignId_date: {
                campaignId: campaign.id,
                date: daily.day,
              },
            },
            create: {
              campaignId: campaign.id,
              date: daily.day,
              impressions: daily.impressions,
              reach: daily.reach,
              spend: daily.spend,
              visitors: daily.visitors,
              visits: daily.visits,
            },
            update: {
              impressions: daily.impressions,
              reach: daily.reach,
              spend: daily.spend,
              visitors: daily.visitors,
              visits: daily.visits,
            },
          });
          dailyRowCount++;
        } catch (err) {
          logError(
            `Failed to upsert daily stat for campaign ${agg.campaignInternalId} on ${daily.day}: ${err}`
          );
          errors++;
        }
      }

      // Create/update Activity records — split into flights if multiple air dates
      try {
        const flights = splitIntoFlights(agg);
        for (const flight of flights) {
          const activityId = deterministicActivityId(
            "podcast",
            agg.show,
            flight.date
          );

          await prisma.activity.upsert({
            where: { id: activityId },
            create: {
              id: activityId,
              channel: "podcast",
              partnerName: agg.show,
              date: flight.date,
              activityType: agg.type || "baked-in",
              costUsd: flight.spend,
              status: "live",
              source: "podscribe",
              notes: `Publisher: ${agg.publisher}`,
              metadata: JSON.stringify({
                podscribeCampaignId: agg.campaignInternalId,
                publisher: agg.publisher,
                totalImpressions: flight.impressions,
                totalVisitors: flight.visitors,
                totalVisits: flight.visits,
                flightStart: flight.startDate,
                flightEnd: flight.endDate,
              }),
            },
            update: {
              activityType: agg.type || "baked-in",
              costUsd: flight.spend,
              status: "live",
              source: "podscribe",
              notes: `Publisher: ${agg.publisher}`,
              metadata: JSON.stringify({
                podscribeCampaignId: agg.campaignInternalId,
                publisher: agg.publisher,
                totalImpressions: flight.impressions,
                totalVisitors: flight.visitors,
                totalVisits: flight.visits,
                flightStart: flight.startDate,
                flightEnd: flight.endDate,
              }),
            },
          });
          activityCount++;
        }
      } catch (err) {
        logError(
          `Failed to upsert activity for campaign ${agg.campaignInternalId}: ${err}`
        );
        errors++;
      }
    } catch (err) {
      logError(
        `Failed to upsert campaign ${agg.campaignInternalId}: ${err}`
      );
      errors++;
    }
  }

  log(
    `Sync complete: ${campaignCount} campaigns, ${dailyRowCount} daily rows, ${activityCount} activities, ${errors} errors`
  );

  return {
    campaigns: campaignCount,
    dailyRows: dailyRowCount,
    activities: activityCount,
    errors,
  };
}
