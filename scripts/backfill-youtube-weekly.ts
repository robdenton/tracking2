/**
 * YouTube Weekly Time Window Search
 *
 * Searches in weekly chunks to find videos that might be missed by
 * standard search + pagination approach.
 *
 * Usage: npx tsx scripts/backfill-youtube-weekly.ts
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

interface YouTubeSearchResultItem {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  url: string;
  thumbnailUrl: string | null;
  description: string | null;
}

// Generate weekly windows
function generateWeeklyWindows(startDate: string, endDate: string) {
  const windows: Array<{ start: string; end: string }> = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);
  while (current < end) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (weekEnd > end) weekEnd.setTime(end.getTime());

    windows.push({
      start: current.toISOString(),
      end: weekEnd.toISOString(),
    });

    current = new Date(weekEnd);
  }

  return windows;
}

async function searchWeek(
  query: string,
  publishedAfter: string,
  publishedBefore: string
): Promise<YouTubeSearchResultItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    logError("YOUTUBE_API_KEY not found");
    return [];
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.append("part", "snippet");
    url.searchParams.append("type", "video");
    url.searchParams.append("q", query);
    url.searchParams.append("maxResults", "50");
    url.searchParams.append("order", "date");
    url.searchParams.append("publishedAfter", publishedAfter);
    url.searchParams.append("publishedBefore", publishedBefore);
    url.searchParams.append("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      logError(`YouTube API error: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt.split("T")[0],
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || null,
      description: item.snippet.description || null,
    }));
  } catch (err) {
    logError(`Error: ${err}`);
    return [];
  }
}

async function saveSearchResults(query: string, results: YouTubeSearchResultItem[]) {
  const today = new Date().toISOString().slice(0, 10);
  let saved = 0;
  let skipped = 0;

  for (const result of results) {
    const existingImport = await prisma.importedYouTubeVideo.findUnique({
      where: { videoId: result.videoId },
    });

    if (existingImport) {
      skipped++;
      continue;
    }

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
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return { saved, skipped };
}

async function main() {
  log("Starting weekly time-window search...");

  const query = process.env.YOUTUBE_SEARCH_QUERY || "granola ai";

  // Focus on early 2024 where we found gaps
  const startDate = "2024-01-01T00:00:00Z";
  const endDate = "2024-02-01T00:00:00Z";

  log(`Query: "${query}"`);
  log(`Searching: ${startDate} to ${endDate} in weekly windows\n`);

  const windows = generateWeeklyWindows(startDate, endDate);
  log(`Generated ${windows.length} weekly windows\n`);

  let totalNew = 0;

  for (const [index, window] of windows.entries()) {
    const weekStart = window.start.split("T")[0];
    const weekEnd = window.end.split("T")[0];
    log(`\n=== Window ${index + 1}/${windows.length}: ${weekStart} to ${weekEnd} ===`);

    const results = await searchWeek(query, window.start, window.end);
    log(`  Found: ${results.length} results`);

    if (results.length > 0) {
      const { saved, skipped } = await saveSearchResults(query, results);
      log(`  Saved: ${saved} new, Skipped: ${skipped} duplicates`);
      totalNew += saved;
    }

    // Rate limiting between windows
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  log(`\n=== Complete ===`);
  log(`Total new videos found: ${totalNew}`);

  const total = await prisma.youTubeSearchResult.count({
    where: { searchQuery: query },
  });
  log(`Total in database: ${total}`);
}

main()
  .catch((e) => {
    logError(`Unexpected error: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
