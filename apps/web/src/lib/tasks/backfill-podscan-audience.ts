/**
 * Backfill podcast_audience_size for podscan_mentions rows whose podcast
 * doesn't yet have an audience number stored.
 *
 * Designed to be called daily by a Vercel cron. Limited to N podcasts per
 * run to fit within the Podscan Premium daily budget (2,000 req/day) plus
 * other crons.
 *
 * Priority order:
 *   1. Podcasts with product-classified mentions (most valuable to show)
 *   2. Podcasts with ambiguous mentions (might resolve to product)
 *   3. Everything else
 */

import { prisma } from "../prisma";
import { getPodcastAudienceSize } from "../podscan";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [Podscan Audience Backfill] ${msg}`);
}

export async function backfillPodscanAudience(opts: {
  limit?: number;
  delayMs?: number;
} = {}): Promise<{ enriched: number; checked: number; remaining: number }> {
  const limit = opts.limit ?? 1500;
  const delayMs = opts.delayMs ?? 600;

  log(`Backfilling audience_size (limit=${limit}, delay=${delayMs}ms)...`);

  // Priority order:
  //   1. Podcasts with Dec 2025 episodes (current analysis focus)
  //   2. Then by classification: product > ambiguous > others
  //   3. Random tiebreak so we make progress across the corpus
  const todo = await prisma.$queryRawUnsafe<
    Array<{ podcast_id: string; priority: number; name: string }>
  >(
    `WITH ranked AS (
       SELECT
         podcast_id,
         MAX(podcast_name) as name,
         CASE WHEN bool_or(posted_at >= '2025-12-01' AND posted_at < '2026-01-01') THEN 0 ELSE 1 END as is_dec,
         CASE
           WHEN bool_or(llm_classification='product') THEN 1
           WHEN bool_or(llm_classification='ambiguous') THEN 2
           ELSE 3
         END as priority
       FROM podscan_mentions
       WHERE podcast_audience_size IS NULL
         AND podcast_id != 'unknown'
         AND excluded = false
       GROUP BY podcast_id
     )
     SELECT podcast_id, priority, name
     FROM ranked
     ORDER BY is_dec ASC, priority ASC, RANDOM()
     LIMIT ${limit}`,
  );

  log(`${todo.length} podcasts to enrich this run`);

  let enriched = 0;
  for (const pod of todo) {
    try {
      const size = await getPodcastAudienceSize(pod.podcast_id);
      if (size !== null) {
        await prisma.podscanMention.updateMany({
          where: { podcastId: pod.podcast_id },
          data: { podcastAudienceSize: size },
        });
        enriched++;
      }
    } catch (err) {
      log(`  ! ${pod.name}: ${(err as Error).message}`);
    }
    await new Promise((s) => setTimeout(s, delayMs));
  }

  const remainingResult = await prisma.$queryRawUnsafe<
    Array<{ count: bigint }>
  >(
    `SELECT COUNT(DISTINCT podcast_id) as count
     FROM podscan_mentions
     WHERE podcast_audience_size IS NULL
       AND podcast_id != 'unknown'
       AND excluded = false`,
  );
  const remaining = Number(remainingResult[0]?.count ?? 0);

  log(`Done: enriched=${enriched}/${todo.length}, remaining=${remaining}`);

  return { enriched, checked: todo.length, remaining };
}
