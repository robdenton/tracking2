/**
 * YouTube Search Script
 *
 * Searches YouTube for "granola ai" mentions and saves results to database
 * for user review (accept/reject).
 *
 * Usage:  npx tsx scripts/search-youtube.ts
 *   or:   npm run search-youtube
 *
 * This script should be run daily (via cron or LaunchAgent) to find new
 * videos mentioning the brand.
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
// YouTube Search
// ---------------------------------------------------------------------------

interface YouTubeSearchResultItem {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string; // YYYY-MM-DD
  url: string;
  thumbnailUrl: string | null;
  description: string | null;
}

/**
 * Search YouTube using Data API v3
 * Returns up to 50 results per search
 */
async function searchYouTube(
  query: string
): Promise<YouTubeSearchResultItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    logError("YOUTUBE_API_KEY not found in .env. Cannot perform search.");
    return [];
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=50&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      logError(`YouTube API error: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      log("No results found");
      return [];
    }

    return data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt.split("T")[0], // Extract YYYY-MM-DD
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || null,
      description: item.snippet.description || null,
    }));
  } catch (err) {
    logError(`Error searching YouTube: ${err}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Save Results
// ---------------------------------------------------------------------------

/**
 * Save search results to database (upsert to handle re-runs)
 */
async function saveSearchResults(
  query: string,
  results: YouTubeSearchResultItem[]
) {
  const today = new Date().toISOString().slice(0, 10);

  let skipped = 0;
  let saved = 0;

  for (const result of results) {
    // Check if already imported
    const existingImport = await prisma.importedYouTubeVideo.findUnique({
      where: { videoId: result.videoId },
    });

    if (existingImport) {
      log(`  Skipping ${result.videoId} - already imported`);
      skipped++;
      continue;
    }

    // Upsert search result
    await prisma.youTubeSearchResult.upsert({
      where: {
        videoId_searchQuery: {
          videoId: result.videoId,
          searchQuery: query,
        },
      },
      create: {
        videoId: result.videoId,
        title: result.title,
        channelTitle: result.channelTitle,
        channelId: result.channelId,
        publishedAt: result.publishedAt,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        description: result.description,
        searchQuery: query,
        searchDate: today,
        status: "pending",
      },
      update: {
        // Update metadata if video re-appears in search
        title: result.title,
        searchDate: today,
      },
    });

    log(`  Saved: ${result.title}`);
    saved++;

    // Rate limiting: sleep 50ms between database operations
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  log(`\nSave complete:`);
  log(`  Saved: ${saved}`);
  log(`  Skipped (already imported): ${skipped}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log("Starting YouTube search...");

  const query = process.env.YOUTUBE_SEARCH_QUERY || "granola ai";
  log(`Searching for: "${query}"`);

  const results = await searchYouTube(query);

  log(`Found ${results.length} results`);

  if (results.length === 0) {
    log("No results to save");
    return;
  }

  await saveSearchResults(query, results);

  log("Search complete");
}

main()
  .catch((e) => {
    logError(`Unexpected error: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
