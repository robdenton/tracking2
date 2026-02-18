/**
 * Scheduled YouTube Search Task Module
 *
 * Searches YouTube for mentions and saves results to database for user review.
 *
 * Key behaviours:
 *  - Uses `publishedAfter` to only find videos uploaded since the last run
 *    (falls back to 7 days on first run).
 *  - Orders by date (newest first) so we always surface fresh uploads.
 *  - Skips videos that are already in ImportedYouTubeVideo (accepted) OR
 *    already in YouTubeSearchResult (pending/rejected) — so rejected videos
 *    don't keep resurfacing.
 */

import { prisma } from "../prisma";

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
 * Search YouTube for videos matching `query`, published after `publishedAfter`.
 * Results are ordered by date (newest first).
 */
async function searchYouTube(
  query: string,
  publishedAfter: string, // ISO-8601 datetime, e.g. "2026-02-11T00:00:00Z"
): Promise<YouTubeSearchResultItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    logError("YOUTUBE_API_KEY not found in .env. Cannot perform search.");
    return [];
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: query,
      maxResults: "50",
      order: "date", // newest first — find fresh uploads, not the same top-50
      publishedAfter, // only videos after this timestamp
      key: apiKey,
    });

    const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
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
  results: YouTubeSearchResultItem[],
): Promise<{ saved: number; skippedImported: number; skippedExisting: number }> {
  const today = new Date().toISOString().slice(0, 10);

  let skippedImported = 0;
  let skippedExisting = 0;
  let saved = 0;

  for (const result of results) {
    // 1. Skip if already accepted into ImportedYouTubeVideo
    const existingImport = await prisma.importedYouTubeVideo.findUnique({
      where: { videoId: result.videoId },
    });

    if (existingImport) {
      log(`  Skipping ${result.videoId} - already imported`);
      skippedImported++;
      continue;
    }

    // 2. Skip if already in YouTubeSearchResult (pending or rejected)
    const existingSearchResult = await prisma.youTubeSearchResult.findUnique({
      where: {
        videoId_searchQuery: {
          videoId: result.videoId,
          searchQuery: query,
        },
      },
    });

    if (existingSearchResult) {
      log(`  Skipping ${result.videoId} - already in search results (${existingSearchResult.status})`);
      skippedExisting++;
      continue;
    }

    // 3. Genuinely new — create
    await prisma.youTubeSearchResult.create({
      data: {
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
    });

    saved++;
  }

  log(
    `Saved ${saved} new, skipped ${skippedImported} imported + ${skippedExisting} already seen`,
  );

  return { saved, skippedImported, skippedExisting };
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

    // Determine publishedAfter: use the most recent searchDate in the DB,
    // or fall back to 7 days ago on first ever run.
    const latestSearchResult = await prisma.youTubeSearchResult.findFirst({
      where: { searchQuery: query },
      orderBy: { searchDate: "desc" },
      select: { searchDate: true },
    });

    let publishedAfter: string;
    if (latestSearchResult) {
      // Start from the last search date (at midnight UTC)
      publishedAfter = `${latestSearchResult.searchDate}T00:00:00Z`;
      log(`Using publishedAfter from last search: ${publishedAfter}`);
    } else {
      // First run — look back 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
      publishedAfter = sevenDaysAgo.toISOString().split(".")[0] + "Z";
      log(`First run — using publishedAfter: ${publishedAfter}`);
    }

    // Perform search
    const results = await searchYouTube(query, publishedAfter);
    log(`Found ${results.length} results from YouTube API`);

    if (results.length === 0) {
      log("No results to save");
      return { resultsFound: 0, saved: 0, skipped: 0 };
    }

    // Save to database
    const { saved, skippedImported, skippedExisting } = await saveSearchResults(
      query,
      results,
    );

    // Calculate duration
    const endTime = new Date();
    const duration = (
      (endTime.getTime() - startTime.getTime()) /
      1000
    ).toFixed(2);
    log(`=== YouTube Search Daily Task Completed in ${duration}s ===`);

    return {
      resultsFound: results.length,
      saved,
      skipped: skippedImported + skippedExisting,
    };
  } catch (err) {
    logError(`Fatal error in YouTube search: ${err}`);
    throw err;
  }
}
