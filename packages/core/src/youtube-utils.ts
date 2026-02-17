/**
 * Shared YouTube API utilities
 * Used by both track-youtube-views.ts and track-imported-views.ts
 */

/**
 * Extract video ID from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
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

/**
 * Fetch view count using YouTube Data API v3.
 * Requires YOUTUBE_API_KEY in .env
 *
 * Get your API key from: https://console.cloud.google.com/apis/credentials
 * Enable YouTube Data API v3 for your project.
 */
export async function fetchViewCountAPI(videoId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error("[youtube-utils] YOUTUBE_API_KEY not found in .env. Cannot fetch view counts.");
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[youtube-utils] YouTube API error for ${videoId}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.error(`[youtube-utils] Video ${videoId} not found`);
      return null;
    }

    const viewCount = parseInt(data.items[0].statistics.viewCount, 10);
    return isNaN(viewCount) ? null : viewCount;
  } catch (err) {
    console.error(`[youtube-utils] Error fetching view count for ${videoId}: ${err}`);
    return null;
  }
}
