/**
 * Growi API client — fetches UGC creator programme stats.
 *
 * Env: GROWI_API_KEY
 * Base: https://api.growi.io/api/public/v1
 */

const BASE = "https://api.growi.io/api/public/v1";

function getKey(): string {
  const key = process.env.GROWI_API_KEY?.trim();
  if (!key) throw new Error("GROWI_API_KEY is not set");
  return key;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getKey()}`,
    "Content-Type": "application/json",
  };
}

export interface GrowiSnapshot {
  date: string; // YYYY-MM-DD
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  total_posts_count: number;
  user_content_ids?: string[]; // e.g. ["instagram:DWaX3mWDdNF", "tik_tok:7622476646314036510"]
}

/**
 * Fetch daily snapshots from Growi for a date range.
 * Dates must be in MM/DD/YYYY format for the API.
 */
export async function getSnapshots(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<GrowiSnapshot[]> {
  // Convert YYYY-MM-DD to MM/DD/YYYY for the API
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${m}/${day}/${y}`;
  };

  const url = `${BASE}/stats/snapshots?start_date=${fmtDate(startDate)}&end_date=${fmtDate(endDate)}&limit=10000`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Growi snapshots failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.data?.snapshots ?? [];
}

export interface GrowiPost {
  id: string;
  platform: string; // tik_tok, instagram, twitter, youtube, unknown
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

/**
 * Fetch top posts by views for a date range (up to 10,000).
 * Each post includes platform and metrics.
 */
export async function getTopPostsByViews(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<GrowiPost[]> {
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${m}/${day}/${y}`;
  };

  const url = `${BASE}/stats/top_posts_by_views?start_date=${fmtDate(startDate)}&end_date=${fmtDate(endDate)}&limit=10000`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Growi top_posts_by_views failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return (data.data?.top_posts_by_views ?? []).map((p: any) => ({
    id: p.id,
    platform: p.platform ?? "unknown",
    metrics: {
      views: p.metrics?.views ?? 0,
      likes: p.metrics?.likes ?? 0,
      comments: p.metrics?.comments ?? 0,
      shares: p.metrics?.shares ?? 0,
    },
  }));
}
