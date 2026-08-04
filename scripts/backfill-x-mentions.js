/**
 * One-off X (Twitter) backfill — pulls every "granola" tweet from the
 * last N days (max 7 per X Search Recent endpoint).
 *
 *   DATABASE_URL=... X_BEARER_TOKEN=... node scripts/backfill-x-mentions.js
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const TOKEN = process.env.X_BEARER_TOKEN;
const BASE = "https://api.x.com";
const QUERY = "granola -is:retweet";
const HOURS_BACK = parseInt(process.argv[2] || "168", 10); // default 7 days
const DELAY_MS = 2200; // ~450 req / 15min budget

async function fetchPage(params) {
  const url = new URL(BASE + "/2/tweets/search/recent");
  url.searchParams.set("query", params.query);
  url.searchParams.set("max_results", "100");
  url.searchParams.set(
    "tweet.fields",
    "created_at,public_metrics,lang,conversation_id,author_id,in_reply_to_user_id,referenced_tweets",
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "name,username,verified,public_metrics");
  if (params.startTime) url.searchParams.set("start_time", params.startTime);
  if (params.nextToken) url.searchParams.set("next_token", params.nextToken);

  let attempt = 0;
  while (attempt < 4) {
    const r = await fetch(url.toString(), {
      headers: { Authorization: "Bearer " + TOKEN },
    });
    if (r.status === 429) {
      const reset = parseInt(r.headers.get("x-rate-limit-reset") || "0", 10);
      const waitMs = Math.max(reset * 1000 - Date.now(), 5000);
      console.log(`    429 — sleeping ${Math.round(waitMs / 1000)}s`);
      await new Promise((s) => setTimeout(s, waitMs));
      attempt++;
      continue;
    }
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
    }
    return await r.json();
  }
  throw new Error("Too many 429s");
}

(async () => {
  const startTime = new Date(
    Date.now() - HOURS_BACK * 60 * 60 * 1000,
  ).toISOString();
  console.log(`Fetching "${QUERY}" since ${startTime}`);

  const allTweets = [];
  const userMap = new Map();
  let nextToken;
  let page = 1;

  while (true) {
    const j = await fetchPage({
      query: QUERY,
      startTime,
      nextToken,
    });
    const tweets = j.data || [];
    for (const u of j.includes?.users || []) userMap.set(u.id, u);
    allTweets.push(...tweets);
    console.log(
      `  page ${page}: +${tweets.length} (running total ${allTweets.length})`,
    );
    nextToken = j.meta?.next_token;
    if (!nextToken) break;
    page++;
    if (page > 200) {
      console.log("  safety cap at 200 pages — stopping");
      break;
    }
    await new Promise((s) => setTimeout(s, DELAY_MS));
  }

  console.log();
  console.log(`Fetched ${allTweets.length} tweets across ${page} page(s)`);

  let inserted = 0,
    updated = 0,
    err = 0;
  const now = new Date();

  for (const t of allTweets) {
    try {
      const u = userMap.get(t.author_id);
      const m = t.public_metrics || {};
      const data = {
        conversationId: t.conversation_id || null,
        inReplyToTweetId:
          t.referenced_tweets?.find((r) => r.type === "replied_to")?.id || null,
        text: t.text,
        lang: t.lang || null,
        postedAt: new Date(t.created_at),
        authorId: t.author_id,
        authorUsername: u?.username || null,
        authorName: u?.name || null,
        authorVerified: u?.verified ?? null,
        authorFollowers: u?.public_metrics?.followers_count ?? null,
        impressionCount: m.impression_count ?? 0,
        likeCount: m.like_count ?? 0,
        retweetCount: m.retweet_count ?? 0,
        replyCount: m.reply_count ?? 0,
        quoteCount: m.quote_count ?? 0,
        bookmarkCount: m.bookmark_count ?? 0,
        lastSeenAt: now,
      };
      const existing = await p.xMention.findUnique({
        where: { tweetId: t.id },
        select: { tweetId: true },
      });
      if (existing) {
        await p.xMention.update({ where: { tweetId: t.id }, data });
        updated++;
      } else {
        await p.xMention.create({ data: { tweetId: t.id, ...data } });
        inserted++;
      }
      if ((inserted + updated) % 100 === 0)
        console.log(`  upserted ${inserted + updated}/${allTweets.length}...`);
    } catch (e) {
      console.log("  ! err on", t.id, e.message);
      err++;
    }
  }

  console.log();
  console.log(`Done: ${inserted} inserted, ${updated} updated, ${err} errors`);

  const stats = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE llm_classification IS NULL) as unclassified,
            COALESCE(SUM(impression_count), 0)::bigint as total_impressions
     FROM x_mentions WHERE excluded=false`,
  );
  console.log(
    "DB:",
    JSON.stringify(stats, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
