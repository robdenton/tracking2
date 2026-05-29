/**
 * X (Twitter) Sync Task
 *
 * Searches X for tweets matching the brand query and upserts them into
 * `x_mentions`. Search Recent only goes back 7 days; daily cron at 24h
 * intervals keeps the corpus fresh forward in time.
 *
 * Excludes retweets (their impression_count is already counted on the
 * original tweet). Includes quote tweets (unique content).
 */

import { prisma } from "../prisma";
import { searchAllRecent } from "../x";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [X Sync] ${msg}`);
}

const QUERY = "granola -is:retweet";

export interface XSyncResult {
  totalFound: number;
  inserted: number;
  updated: number;
  errors: number;
  truncated: boolean;
}

export async function syncXMentions(opts: {
  hoursBack?: number;
  maxPages?: number;
  delayMs?: number;
} = {}): Promise<XSyncResult> {
  const hoursBack = opts.hoursBack ?? 25; // catch a little overlap with yesterday
  const maxPages = opts.maxPages ?? 100;
  const delayMs = opts.delayMs ?? 2200;

  const startTime = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000
  ).toISOString();

  log(`Searching: "${QUERY}" since ${startTime}`);

  const { tweets, truncated } = await searchAllRecent({
    query: QUERY,
    startTime,
    maxPages,
    delayMs,
  });

  log(`Fetched ${tweets.length} tweets${truncated ? " [TRUNCATED]" : ""}`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const now = new Date();

  for (const t of tweets) {
    try {
      const m = t.public_metrics ?? {};
      const data = {
        conversationId: t.conversation_id ?? null,
        inReplyToTweetId:
          t.referenced_tweets?.find((r) => r.type === "replied_to")?.id ?? null,
        text: t.text,
        lang: t.lang ?? null,
        postedAt: new Date(t.created_at),
        authorId: t.author_id,
        authorUsername: t.author?.username ?? null,
        authorName: t.author?.name ?? null,
        authorVerified: t.author?.verified ?? null,
        authorFollowers: t.author?.public_metrics?.followers_count ?? null,
        impressionCount: m.impression_count ?? 0,
        likeCount: m.like_count ?? 0,
        retweetCount: m.retweet_count ?? 0,
        replyCount: m.reply_count ?? 0,
        quoteCount: m.quote_count ?? 0,
        bookmarkCount: m.bookmark_count ?? 0,
        lastSeenAt: now,
      };
      const existing = await prisma.xMention.findUnique({
        where: { tweetId: t.id },
        select: { tweetId: true },
      });
      if (existing) {
        await prisma.xMention.update({ where: { tweetId: t.id }, data });
        updated++;
      } else {
        await prisma.xMention.create({ data: { tweetId: t.id, ...data } });
        inserted++;
      }
    } catch (err) {
      log(`  ! Upsert failed for ${t.id}: ${(err as Error).message}`);
      errors++;
    }
  }

  log(
    `Sync complete: ${inserted} new, ${updated} updated, ${errors} errors`
  );

  return {
    totalFound: tweets.length,
    inserted,
    updated,
    errors,
    truncated,
  };
}
