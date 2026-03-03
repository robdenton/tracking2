/**
 * YouTube video metadata helpers.
 *
 * Fetches full video details (description, duration, like/comment counts)
 * via the YouTube Data API v3 videos.list endpoint, which costs only 1 quota
 * unit per call and can batch up to 50 videos at once.
 */

export interface VideoMeta {
  description: string | null;
  durationSeconds: number | null;
  likeCount: number | null;
  commentCount: number | null;
}

/**
 * Parse ISO 8601 duration string (e.g. "PT1H30M15S") to total seconds.
 */
export function parseISODuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch full metadata for up to N YouTube video IDs (batched in groups of 50).
 * Returns a Map of videoId → VideoMeta.
 */
export async function fetchVideoMetadata(
  videoIds: string[],
): Promise<Map<string, VideoMeta>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");

  const result = new Map<string, VideoMeta>();
  const BATCH = 50;

  for (let i = 0; i < videoIds.length; i += BATCH) {
    const batch = videoIds.slice(i, i + BATCH);
    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: batch.join(","),
      key: apiKey,
    });

    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `YouTube videos.list API error: HTTP ${response.status} ${await response.text()}`,
      );
    }

    const data = await response.json();

    for (const item of data.items ?? []) {
      const videoId: string = item.id;
      const snippet = item.snippet ?? {};
      const contentDetails = item.contentDetails ?? {};
      const stats = item.statistics ?? {};

      result.set(videoId, {
        description: snippet.description ?? null,
        durationSeconds: contentDetails.duration
          ? parseISODuration(contentDetails.duration)
          : null,
        likeCount: stats.likeCount != null ? parseInt(stats.likeCount, 10) : null,
        commentCount:
          stats.commentCount != null ? parseInt(stats.commentCount, 10) : null,
      });
    }
  }

  return result;
}

/**
 * Detect whether the video description contains a link to granola domains
 * (granola.so, granola.ai, go.granola.ai, etc.) and whether it carries
 * tracking parameters (indicating an affiliate / tracked link).
 */
export function detectGranolaLink(description: string): {
  granolaLinkInDesc: boolean;
  granolaLinkType: "direct" | "tracked" | "none";
} {
  const urlRegex = /https?:\/\/[^\s<>")\]]+/g;
  const urls = description.match(urlRegex) ?? [];

  const granolaUrls = urls.filter((url) =>
    /granola\.(so|ai|io)/.test(url),
  );

  if (granolaUrls.length === 0) {
    return { granolaLinkInDesc: false, granolaLinkType: "none" };
  }

  const hasTracking = granolaUrls.some(
    (url) =>
      url.includes("utm_") ||
      url.includes("ref=") ||
      url.includes("via=") ||
      url.includes("aff=") ||
      url.includes("?r="),
  );

  return {
    granolaLinkInDesc: true,
    granolaLinkType: hasTracking ? "tracked" : "direct",
  };
}

/**
 * Detect whether a video description includes a sponsored / paid partnership
 * disclosure (required by FTC / YouTube policy for paid content).
 */
export function detectSponsoredDisclosure(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes("#ad") ||
    lower.includes("#sponsored") ||
    lower.includes("sponsored by") ||
    lower.includes("this video is sponsored") ||
    lower.includes("paid partnership") ||
    lower.includes("paid promotion") ||
    lower.includes("in partnership with")
  );
}
