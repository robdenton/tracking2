/**
 * Imported YouTube Video View Tracker Task Module
 *
 * Fetches current view counts for all imported YouTube videos
 * and stores them in the imported_video_views table for time-series analysis.
 */

import { prisma } from "../prisma";
import { fetchViewCountAPI } from "@mai/core";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

export async function trackImportedViews(): Promise<{
  tracked: number;
  skipped: number;
  errors: number;
}> {
  log("Starting imported video view tracker...");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Fetch all active imported videos
  const videos = await prisma.importedYouTubeVideo.findMany({
    where: {
      status: "active",
    },
  });

  log(`Found ${videos.length} imported videos to track`);

  let tracked = 0;
  let skipped = 0;
  let errors = 0;

  for (const video of videos) {
    log(`Fetching views for ${video.title} (${video.videoId})...`);

    const viewCount = await fetchViewCountAPI(video.videoId);

    if (viewCount === null) {
      logError(`Could not fetch view count for ${video.title}`);
      errors++;
      continue;
    }

    // Upsert the view count for today
    await prisma.importedVideoView.upsert({
      where: {
        videoId_date: {
          videoId: video.id,
          date: today,
        },
      },
      create: {
        videoId: video.id,
        date: today,
        viewCount,
      },
      update: {
        viewCount,
      },
    });

    log(`  ✓ ${video.title}: ${viewCount.toLocaleString()} views`);
    tracked++;

    // Rate limiting: sleep 100ms between requests to avoid hitting API limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  log(`\nTracking complete:`);
  log(`  Tracked: ${tracked}`);
  log(`  Skipped: ${skipped}`);
  log(`  Errors: ${errors}`);

  return { tracked, skipped, errors };
}
