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
