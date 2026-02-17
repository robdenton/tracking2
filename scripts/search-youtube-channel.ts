/**
 * YouTube Channel Video Search
 *
 * Searches for all videos from a specific YouTube channel.
 * Useful for importing all videos from the official Granola channel.
 *
 * Usage:  npx tsx scripts/search-youtube-channel.ts
 *   or:   npm run search-youtube-channel
 *
 * Set YOUTUBE_CHANNEL_ID or YOUTUBE_CHANNEL_HANDLE in .env
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
// Get Channel ID from Handle
// ---------------------------------------------------------------------------

/**
 * Convert channel handle (@meetgranola) to channel ID
 */
async function getChannelIdFromHandle(handle: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    logError("YOUTUBE_API_KEY not found");
    return null;
  }

  try {
    // Remove @ if present
    const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

    // Search for the channel
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleanHandle)}&maxResults=1&key=${apiKey}`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      logError(`YouTube API error: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      logError(`Channel not found: ${handle}`);
      return null;
    }

    const channelId = data.items[0].snippet.channelId;
    log(`Found channel ID: ${channelId}`);
    return channelId;
  } catch (err) {
    logError(`Error getting channel ID: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Search Channel Videos with Pagination
// ---------------------------------------------------------------------------

/**
 * Search all videos from a specific channel with pagination
 */
async function searchChannelVideos(channelId: string): Promise<YouTubeSearchResultItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    logError("YOUTUBE_API_KEY not found");
    return [];
  }

  const allResults: YouTubeSearchResultItem[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 50; // Up to 50 pages (2,500 videos max)

  try {
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.append("part", "snippet");
      url.searchParams.append("channelId", channelId);
      url.searchParams.append("type", "video");
      url.searchParams.append("maxResults", "50");
      url.searchParams.append("order", "date"); // Newest first
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
        log(`  No more results on page ${pageCount + 1}`);
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

      log(`  Page ${pageCount}: ${pageResults.length} videos (total: ${allResults.length})`);

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
    logError(`Error in searchChannelVideos: ${err}`);
    return allResults;
  }
}

// ---------------------------------------------------------------------------
// Save Results
// ---------------------------------------------------------------------------

/**
 * Save channel videos to database
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
  log("Starting YouTube channel video search...\n");

  // Get channel ID or handle from environment
  let channelId = process.env.YOUTUBE_CHANNEL_ID;
  const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE || "@meetgranola";

  if (!channelId) {
    log(`No YOUTUBE_CHANNEL_ID provided, looking up handle: ${channelHandle}`);
    channelId = await getChannelIdFromHandle(channelHandle);

    if (!channelId) {
      logError("Could not determine channel ID");
      process.exit(1);
    }
  }

  log(`Searching all videos from channel ID: ${channelId}\n`);

  // Search all videos from this channel
  log("=== Searching Channel Videos with Pagination ===");
  const results = await searchChannelVideos(channelId);

  log(`\nCollected ${results.length} total videos`);

  if (results.length === 0) {
    log("No videos to save");
    return;
  }

  // Save to database
  log("\n=== Saving Results to Database ===");
  const queryLabel = `channel:${channelId}`;
  await saveSearchResults(queryLabel, results);

  // Report final stats
  log("\n=== Channel Search Complete ===");

  const totalSearchResults = await prisma.youTubeSearchResult.count({});
  const pendingCount = await prisma.youTubeSearchResult.count({
    where: { status: "pending" },
  });

  log(`Total search results in database: ${totalSearchResults}`);
  log(`Pending review: ${pendingCount}`);
  log(`\nNext steps:`);
  log(`  1. Run 'npm run dev' and visit http://localhost:3000/youtube-import/review`);
  log(`  2. Accept relevant videos (your own channel videos are auto-relevant!)`);
  log(`  3. Run 'npm run track-imported-views' to fetch view counts`);
}

main()
  .catch((e) => {
    logError(`Unexpected error: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
