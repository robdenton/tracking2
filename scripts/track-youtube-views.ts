/**
 * YouTube View Tracker
 *
 * Fetches current view counts for all YouTube activities with contentUrl
 * and stores them in the content_views table for time-series analysis.
 *
 * Usage:  npx tsx scripts/track-youtube-views.ts
 *   or:   npm run track-views
 *
 * This script should be run daily (via cron or LaunchAgent) to build a
 * time series of view counts for each sponsored YouTube video.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

// ---------------------------------------------------------------------------
// YouTube URL parsing
// ---------------------------------------------------------------------------

/**
 * Extract video ID from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    // youtube.com/watch?v=...
    if (parsed.hostname.includes("youtube.com") && parsed.pathname === "/watch") {
      return parsed.searchParams.get("v");
    }

    // youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1); // Remove leading /
    }

    // youtube.com/embed/VIDEO_ID
    if (parsed.hostname.includes("youtube.com") && parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/")[2];
    }

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// YouTube view count fetching
// ---------------------------------------------------------------------------

/**
 * Fetch view count for a YouTube video using the oEmbed API.
 * This doesn't require API keys but has rate limits.
 *
 * Alternative: Use YouTube Data API v3 with an API key for more reliable access.
 * Set YOUTUBE_API_KEY in .env and uncomment the API version below.
 */
async function fetchViewCountOembed(videoId: string): Promise<number | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      logError(`Failed to fetch oEmbed for ${videoId}: HTTP ${response.status}`);
      return null;
    }

    // oEmbed doesn't directly provide view count, we need to scrape the page
    // For now, return null and recommend using YouTube Data API
    return null;
  } catch (err) {
    logError(`Error fetching oEmbed for ${videoId}: ${err}`);
    return null;
  }
}

/**
 * Fetch view count using YouTube Data API v3.
 * Requires YOUTUBE_API_KEY in .env
 *
 * Get your API key from: https://console.cloud.google.com/apis/credentials
 * Enable YouTube Data API v3 for your project.
 */
async function fetchViewCountAPI(videoId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    logError("YOUTUBE_API_KEY not found in .env. Cannot fetch view counts.");
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      logError(`YouTube API error for ${videoId}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      logError(`Video ${videoId} not found`);
      return null;
    }

    const viewCount = parseInt(data.items[0].statistics.viewCount, 10);
    return isNaN(viewCount) ? null : viewCount;
  } catch (err) {
    logError(`Error fetching view count for ${videoId}: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
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

  log(`\nTracking complete:`);
  log(`  Tracked: ${tracked}`);
  log(`  Skipped: ${skipped}`);
  log(`  Errors: ${errors}`);
}

main()
  .catch((e) => {
    logError(`Unexpected error: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
