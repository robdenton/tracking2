/**
 * One-off audience backfill — fetches podcast_audience_size for as many
 * podcasts as the daily Premium quota allows.
 *
 *   DATABASE_URL=... PODSCAN_API_KEY=... node scripts/audience-backfill.js [LIMIT]
 *
 * Default LIMIT=900. Polls Podscan at ~100/min (600ms between calls).
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const KEY = process.env.PODSCAN_API_KEY;
const BASE = "https://podscan.fm";
const LIMIT = parseInt(process.argv[2] || "900", 10);
const DELAY_MS = 600;

async function fetchAudience(podcastId) {
  let wait = 2000;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(BASE + "/api/v1/podcasts/" + podcastId, {
      headers: { Authorization: "Bearer " + KEY },
    });
    if (r.status === 429) {
      const retryAfter = parseInt(r.headers.get("retry-after") || "0", 10);
      console.log(`    429 — sleeping ${retryAfter}s`);
      if (retryAfter > 300) {
        // Daily limit — bail
        const body = await r.text();
        if (body.includes("daily_limit_exceeded")) {
          throw new Error("DAILY_LIMIT_EXCEEDED");
        }
      }
      await new Promise((s) => setTimeout(s, (retryAfter * 1000) || wait));
      wait = Math.min(wait * 2, 60000);
      continue;
    }
    if (!r.ok) return null;
    const j = await r.json();
    return j.podcast?.reach?.audience_size ?? null;
  }
  return null;
}

(async () => {
  // Priority order:
  //   1. Podcasts with Dec 2025 episodes (user's focus period)
  //   2. Then by classification: product > ambiguous > others
  //   3. Then by episode count (more prolific podcasts first)
  const todo = await p.$queryRawUnsafe(
    `WITH ranked AS (
       SELECT
         podcast_id,
         MAX(podcast_name) as name,
         CASE WHEN bool_or(posted_at >= '2025-12-01' AND posted_at < '2026-01-01') THEN 0 ELSE 1 END as is_dec,
         CASE
           WHEN bool_or(llm_classification='product') THEN 1
           WHEN bool_or(llm_classification='ambiguous') THEN 2
           ELSE 3
         END as priority,
         COUNT(*) as episode_count
       FROM podscan_mentions
       WHERE podcast_audience_size IS NULL
         AND podcast_id != 'unknown'
         AND excluded = false
       GROUP BY podcast_id
     )
     SELECT podcast_id, name, is_dec, priority, episode_count
     FROM ranked
     ORDER BY is_dec ASC, priority ASC, episode_count DESC
     LIMIT ${LIMIT}`,
  );

  console.log(`Backfilling audience for ${todo.length} podcasts (limit=${LIMIT})...`);
  console.log(
    `Breakdown by priority: ` +
      todo.reduce((acc, r) => {
        acc[r.priority] = (acc[r.priority] || 0) + 1;
        return acc;
      }, {}),
  );

  let enriched = 0,
    nulls = 0,
    err = 0;
  for (let i = 0; i < todo.length; i++) {
    const pod = todo[i];
    try {
      const size = await fetchAudience(pod.podcast_id);
      if (size !== null) {
        await p.podscanMention.updateMany({
          where: { podcastId: pod.podcast_id },
          data: { podcastAudienceSize: size },
        });
        enriched++;
      } else {
        nulls++;
      }
    } catch (e) {
      if (e.message === "DAILY_LIMIT_EXCEEDED") {
        console.log(`\n⚠️  Daily limit hit at ${i + 1}/${todo.length}. Stopping.`);
        break;
      }
      console.log("  ! err", pod.name, e.message);
      err++;
    }
    if ((i + 1) % 50 === 0) {
      console.log(
        `  ${i + 1}/${todo.length} | enriched=${enriched} nulls=${nulls} err=${err}`,
      );
    }
    await new Promise((s) => setTimeout(s, DELAY_MS));
  }

  console.log();
  console.log(`Done: enriched=${enriched} nulls=${nulls} errors=${err}`);

  const remaining = await p.$queryRawUnsafe(
    `SELECT COUNT(DISTINCT podcast_id)::int as n
     FROM podscan_mentions
     WHERE podcast_audience_size IS NULL AND podcast_id != 'unknown' AND excluded = false`,
  );
  console.log(`Podcasts still without audience_size: ${remaining[0].n}`);

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
