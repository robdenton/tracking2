/**
 * Podscan.fm API client.
 *
 * Env vars:
 *   PODSCAN_API_KEY — bearer token from podscan.fm
 *
 * Note: Podscan rate-limits aggressively (429 after a few requests in quick
 * succession). All fetches go through a polite retry helper.
 */

const BASE = "https://podscan.fm";

function headers(): Record<string, string> {
  const key = process.env.PODSCAN_API_KEY?.trim();
  if (!key) throw new Error("PODSCAN_API_KEY is not set");
  return { Authorization: `Bearer ${key}` };
}

/** Fetch with exponential-backoff retry on 429s. */
async function fetchWithRetry(
  url: string,
  maxAttempts = 6
): Promise<Response> {
  let waitMs = 2000;
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const r = await fetch(url, { headers: headers() });
    lastResponse = r;
    if (r.status !== 429) return r;
    await new Promise((s) => setTimeout(s, waitMs));
    waitMs = Math.min(waitMs * 2, 30000);
  }
  return lastResponse as Response;
}

export interface PodscanEpisode {
  episode_id: string;
  episode_title?: string;
  episode_url?: string;
  episode_audio_url?: string;
  episode_duration?: number;
  posted_at?: string;
  podcast?: {
    podcast_id: string;
    podcast_name?: string;
    podcast_reach_score?: number;
  };
  podcast_id?: string;
  metadata?: {
    is_branded?: boolean;
    is_branded_confidence_score?: number;
    is_branded_confidence_reason?: string;
    summary_short?: string;
    summary_long?: string;
    sentiment?: {
      label?: string;
      score?: number;
    };
  };
}

interface SearchResponse {
  episodes?: PodscanEpisode[];
  pagination?: {
    total?: number;
    per_page?: number;
    current_page?: number;
    last_page?: number;
  };
}

/**
 * Search episodes by query — matches against transcripts, descriptions, and
 * metadata. Returns up to `perPage` results per page. Caller paginates by
 * incrementing `page`.
 */
export async function searchEpisodes(params: {
  query: string;
  page?: number;
  perPage?: number;
}): Promise<SearchResponse> {
  const url = new URL(`${BASE}/api/v1/episodes/search`);
  url.searchParams.set("query", params.query);
  url.searchParams.set("page", String(params.page ?? 1));
  url.searchParams.set("per_page", String(params.perPage ?? 20));

  const r = await fetchWithRetry(url.toString());
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(
      `Podscan searchEpisodes failed (${r.status}): ${body.slice(0, 200)}`
    );
  }
  return r.json();
}

/**
 * Fetch every episode matching a query across all pages. Caps at `maxPages`
 * to avoid runaway queries. Polite delay between page fetches.
 */
export async function searchAllEpisodes(params: {
  query: string;
  maxPages?: number;
  perPage?: number;
  delayMs?: number;
}): Promise<PodscanEpisode[]> {
  const perPage = params.perPage ?? 20;
  const maxPages = params.maxPages ?? 20;
  const delayMs = params.delayMs ?? 2500;

  const all: PodscanEpisode[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const result = await searchEpisodes({ query: params.query, page, perPage });
    const episodes = result.episodes ?? [];
    all.push(...episodes);
    if (episodes.length < perPage) break;
    if (page < maxPages) {
      await new Promise((s) => setTimeout(s, delayMs));
    }
  }
  return all;
}
