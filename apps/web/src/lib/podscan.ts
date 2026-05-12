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

export interface PodscanPagination {
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
}

interface SearchResponse {
  episodes?: PodscanEpisode[];
  pagination?: PodscanPagination;
}

/**
 * Search episodes by query — matches against transcripts, descriptions, and
 * metadata. Returns up to `perPage` results per page (max 50 enforced by
 * Podscan). Caller paginates by incrementing `page`.
 *
 * NOTE: Podscan does NOT support date filtering or sort order on this
 * endpoint. The only way to get exhaustive coverage over a time period is
 * to paginate through every result for each query.
 */
export async function searchEpisodes(params: {
  query: string;
  page?: number;
  perPage?: number;
}): Promise<SearchResponse> {
  const url = new URL(`${BASE}/api/v1/episodes/search`);
  url.searchParams.set("query", params.query);
  url.searchParams.set("page", String(params.page ?? 1));
  // Podscan caps per_page at 50; asking for more is silently downgraded.
  url.searchParams.set("per_page", String(Math.min(params.perPage ?? 50, 50)));

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
 * Fetch every episode matching a query, walking the API's reported
 * `last_page`. Returns the full list plus the final pagination metadata
 * so the caller can report total coverage.
 *
 * Podscan hard-caps results at 10,000 per query. For narrow queries
 * (e.g. "granola.ai" with ~305 total) this returns everything.
 */
export async function searchAllEpisodes(params: {
  query: string;
  maxPages?: number;
  perPage?: number;
  delayMs?: number;
}): Promise<{
  episodes: PodscanEpisode[];
  pagination: PodscanPagination | null;
  truncated: boolean;
}> {
  const perPage = Math.min(params.perPage ?? 50, 50);
  const hardMaxPages = params.maxPages ?? 50; // safety cap (50 * 50 = 2500 episodes)
  const delayMs = params.delayMs ?? 2500;

  const all: PodscanEpisode[] = [];
  let pagination: PodscanPagination | null = null;
  let truncated = false;

  for (let page = 1; page <= hardMaxPages; page++) {
    const result = await searchEpisodes({ query: params.query, page, perPage });
    pagination = result.pagination ?? null;
    const episodes = result.episodes ?? [];
    all.push(...episodes);

    const lastPage = pagination?.last_page ?? page;
    if (page >= lastPage) break;
    if (page >= hardMaxPages) {
      truncated = true;
      break;
    }
    if (episodes.length < perPage) break;

    await new Promise((s) => setTimeout(s, delayMs));
  }

  return { episodes: all, pagination, truncated };
}
