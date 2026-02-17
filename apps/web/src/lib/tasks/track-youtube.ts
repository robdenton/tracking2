/**
 * YouTube View Tracker Task Module
 *
 * Fetches current view counts for all YouTube activities with contentUrl
 * and stores them in the content_views table for time-series analysis.
 */

import { PrismaClient } from "@prisma/client";
import { extractVideoId, fetchViewCountAPI } from "@mai/core";

const prisma = new PrismaClient();

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

export async function trackYouTubeViews(): Promise<{
  tracked: number;
  skipped: number;
  errors: number;
}> {
  log("Starting YouTube view tracker...");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Fetch all YouTube activities with contentUrl
  const activities = await prisma.activity.findMany({
    where: {
      channel: "youtube",
      contentUrl: { not: null },
      status: "live", // Only track live content
    },
  });

  log(`Found ${activities.length} YouTube activities with content URLs`);

  let tracked = 0;
  let skipped = 0;
  let errors = 0;

  for (const activity of activities) {
    if (!activity.contentUrl) {
      skipped++;
      continue;
    }

    const videoId = extractVideoId(activity.contentUrl);

    if (!videoId) {
      logError(`Invalid YouTube URL for ${activity.partnerName}: ${activity.contentUrl}`);
      errors++;
      continue;
    }

    log(`Fetching views for ${activity.partnerName} (${videoId})...`);

    const viewCount = await fetchViewCountAPI(videoId);

    if (viewCount === null) {
      logError(`Could not fetch view count for ${activity.partnerName}`);
      errors++;
      continue;
    }

    // Upsert the view count for today
    await prisma.contentView.upsert({
      where: {
        activityId_date: {
          activityId: activity.id,
          date: today,
        },
      },
      create: {
        activityId: activity.id,
        date: today,
        viewCount,
      },
      update: {
        viewCount,
      },
    });

    log(`  ✓ ${activity.partnerName}: ${viewCount.toLocaleString()} views`);
    tracked++;

    // Rate limiting: sleep 100ms between requests to avoid hitting API limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await prisma.$disconnect();

  log(`\nTracking complete:`);
  log(`  Tracked: ${tracked}`);
  log(`  Skipped: ${skipped}`);
  log(`  Errors: ${errors}`);

  return { tracked, skipped, errors };
}
