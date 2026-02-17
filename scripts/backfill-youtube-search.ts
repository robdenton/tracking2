/**
 * Historical YouTube Search Backfill
 *
 * Searches for all "granola ai" videos from 2024-01-01 to present.
 * Uses pagination to capture comprehensive historical coverage.
 *
 * Usage:  npx tsx scripts/backfill-youtube-search.ts
 *   or:   npm run backfill-youtube
 *
 * This script should be run once to capture historical data, then
 * the daily search-youtube.ts script continues capturing new content.
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
// Types
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

// ---------------------------------------------------------------------------
// YouTube Search with Pagination
// ---------------------------------------------------------------------------

/**
 * Search YouTube with pagination support
 */
async function searchWithPagination(
  query: string,
  publishedAfter: string,
  publishedBefore?: string
): Promise<YouTubeSearchResultItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    logError("YOUTUBE_API_KEY not found in .env");
    return [];
  }

  const allResults: YouTubeSearchResultItem[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 10; // Safety limit (10 pages × 50 = 500 results max)

  try {
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.append("part", "snippet");
      url.searchParams.append("type", "video");
      url.searchParams.append("q", query);
      url.searchParams.append("maxResults", "50");
      url.searchParams.append("order", "date");
      url.searchParams.append("publishedAfter", publishedAfter);
      if (publishedBefore) {
        url.searchParams.append("publishedBefore", publishedBefore);
      }
      if (nextPageToken) {
        url.searchParams.append("pageToken", nextPageToken);
      }
      url.searchParams.append("key", apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        logError(`YouTube API error: HTTP ${response.status}`);
        break;
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        log(`  No results on page ${pageCount + 1}`);
        break;
      }

      // Map results
      const pageResults = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt.split("T")[0],
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || null,
        description: item.snippet.description || null,
      }));

      allResults.push(...pageResults);
      nextPageToken = data.nextPageToken;
      pageCount++;

      log(`  Page ${pageCount}: ${pageResults.length} results (total: ${allResults.length})`);

      // Rate limiting: 1 second between requests
      if (nextPageToken && pageCount < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else if (pageCount >= maxPages) {
        log(`  Reached max pages limit (${maxPages})`);
        break;
      }
    } while (nextPageToken);

    return allResults;
  } catch (err) {
    logError(`Error in searchWithPagination: ${err}`);
    return allResults; // Return what we got so far
  }
}

// ---------------------------------------------------------------------------
// Save Results
// ---------------------------------------------------------------------------

/**
 * Save search results to database (upsert to handle duplicates)
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
        // Update metadata if video re-appears
        title: result.title,
        searchDate: today,
      },
    });

    saved++;

    // Rate limiting: 50ms between database operations
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
  log("Starting historical YouTube search backfill...");
  log("This will search for all videos from 2024-01-01 to present\n");

  const query = process.env.YOUTUBE_SEARCH_QUERY || "granola ai";
  const startDate = "2024-01-01T00:00:00Z";
  const endDate = new Date().toISOString();

  log(`Query: "${query}"`);
  log(`Date range: ${startDate} to ${endDate}`);

  // Search with pagination
  log("\n=== Searching YouTube with Pagination ===");
  const results = await searchWithPagination(query, startDate);

  log(`\nCollected ${results.length} total results`);

  if (results.length === 0) {
    log("No results to save");
    return;
  }

  // Save to database
  log("\n=== Saving Results to Database ===");
  await saveSearchResults(query, results);

  // Report final stats
  log("\n=== Backfill Complete ===");

  const totalSearchResults = await prisma.youTubeSearchResult.count({
    where: { searchQuery: query },
  });
  const pendingCount = await prisma.youTubeSearchResult.count({
    where: { searchQuery: query, status: "pending" },
  });

  log(`Total search results in database: ${totalSearchResults}`);
  log(`Pending review: ${pendingCount}`);
  log(`\nNext steps:`);
  log(`  1. Run 'npm run dev' and visit http://localhost:3000/youtube-import/review`);
  log(`  2. Accept relevant videos`);
  log(`  3. Run 'npm run track-imported-views' to fetch view counts`);
}

main()
  .catch((e) => {
    logError(`Unexpected error: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
