/**
 * Scheduled YouTube Search Task Module
 *
 * Searches YouTube for mentions and saves results to database for user review.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function saveSearchResults(
  query: string,
  results: YouTubeSearchResultItem[]
): Promise<{ saved: number; skipped: number }> {
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
        searchDate: today,
      },
    });

    saved++;
  }

  log(`Saved ${saved} new search results, skipped ${skipped} already imported`);

  return { saved, skipped };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function searchAndSaveYouTubeResults(): Promise<{
  resultsFound: number;
  saved: number;
  skipped: number;
}> {
  const startTime = new Date();
  log("=== YouTube Search Daily Task Started ===");

  try {
    // Get search query from env or use default
    const query = process.env.YOUTUBE_SEARCH_QUERY || "granola ai";
    log(`Searching YouTube for: "${query}"`);

    // Perform search
    const results = await searchYouTube(query);
    log(`Found ${results.length} results from YouTube API`);

    if (results.length === 0) {
      log("No results to save");
      await prisma.$disconnect();
      return { resultsFound: 0, saved: 0, skipped: 0 };
    }

    // Save to database
    const { saved, skipped } = await saveSearchResults(query, results);

    // Calculate duration
    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);
    log(`=== YouTube Search Daily Task Completed in ${duration}s ===`);

    await prisma.$disconnect();

    return { resultsFound: results.length, saved, skipped };
  } catch (err) {
    logError(`Fatal error in YouTube search: ${err}`);
    await prisma.$disconnect();
    throw err;
  }
}
