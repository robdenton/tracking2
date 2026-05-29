/**
 * X (Twitter) API v2 client — search recent tweets matching a query.
 *
 * Env vars:
 *   X_BEARER_TOKEN — Bearer Token from the X Developer Portal
 *
 * Docs:
 *   https://docs.x.com/x-api/tweets/recent-search
 *   https://docs.x.com/x-api/fundamentals/metrics
 */

const BASE = "https://api.x.com";

function headers(): Record<string, string> {
  const token = process.env.X_BEARER_TOKEN?.trim();
  if (!token) throw new Error("X_BEARER_TOKEN is not set");
  return { Authorization: `Bearer ${token}` };
}

export interface XPublicMetrics {
  retweet_count?: number;
  reply_count?: number;
  like_count?: number;
  quote_count?: number;
  bookmark_count?: number;
  impression_count?: number;
}

export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  created_at: string; // ISO-8601
  lang?: string;
  public_metrics?: XPublicMetrics;
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to";
    id: string;
  }>;
}

export interface XUser {
  id: string;
  username: string;
  name?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
}

interface SearchResponse {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
  };
  meta?: {
    next_token?: string;
    result_count?: number;
    newest_id?: string;
    oldest_id?: string;
  };
  errors?: Array<{ title?: string; detail?: string }>;
}

/** Search Recent endpoint — last 7 days only */
export async function searchRecent(params: {
  query: string;
  startTime?: string; // ISO-8601
  endTime?: string;
  maxResults?: number; // 10..100
  nextToken?: string;
  sinceId?: string;
}): Promise<SearchResponse> {
  const url = new URL(`${BASE}/2/tweets/search/recent`);
  url.searchParams.set("query", params.query);
  url.searchParams.set("max_results", String(params.maxResults ?? 100));
  url.searchParams.set(
    "tweet.fields",
    "created_at,public_metrics,lang,conversation_id,author_id,in_reply_to_user_id,referenced_tweets"
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "name,username,verified,public_metrics");
  if (params.startTime) url.searchParams.set("start_time", params.startTime);
  if (params.endTime) url.searchParams.set("end_time", params.endTime);
  if (params.nextToken) url.searchParams.set("next_token", params.nextToken);
  if (params.sinceId) url.searchParams.set("since_id", params.sinceId);

  const r = await fetch(url.toString(), { headers: headers() });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(
      `X searchRecent failed (${r.status}): ${body.slice(0, 300)}`
    );
  }
  const j = (await r.json()) as SearchResponse;
  if (j.errors && j.errors.length > 0) {
    throw new Error(
      `X searchRecent errors: ${j.errors.map((e) => e.title ?? e.detail).join(", ")}`
    );
  }
  return j;
}

/**
 * Paginate through every tweet matching `query` within the given window.
 * Returns flat list of tweets with attached user data.
 *
 * Respects X rate limit headers (450 req / 15min on app-auth recent search).
 */
export async function searchAllRecent(params: {
  query: string;
  startTime?: string;
  endTime?: string;
  maxPages?: number;
  delayMs?: number;
}): Promise<{
  tweets: Array<XTweet & { author?: XUser }>;
  truncated: boolean;
}> {
  const maxPages = params.maxPages ?? 100;
  const delayMs = params.delayMs ?? 2200; // ~430 calls / 15min budget

  const allTweets: XTweet[] = [];
  const userMap = new Map<string, XUser>();
  let nextToken: string | undefined;
  let truncated = false;

  for (let page = 1; page <= maxPages; page++) {
    const result = await searchRecent({
      query: params.query,
      startTime: params.startTime,
      endTime: params.endTime,
      maxResults: 100,
      nextToken,
    });
    for (const t of result.data ?? []) allTweets.push(t);
    for (const u of result.includes?.users ?? []) userMap.set(u.id, u);
    nextToken = result.meta?.next_token;
    if (!nextToken) break;
    if (page >= maxPages) {
      truncated = true;
      break;
    }
    await new Promise((s) => setTimeout(s, delayMs));
  }

  return {
    tweets: allTweets.map((t) => ({ ...t, author: userMap.get(t.author_id) })),
    truncated,
  };
}
