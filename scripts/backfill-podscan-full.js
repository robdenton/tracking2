/**
 * Full Podscan backfill (Premium tier, 2000 requests/day, 120/min):
 *
 * Phase 1: Fetch podcast detail for each unique podcast_id in DB, store
 *          `audience_size` on every row for that podcast.
 *
 * Phase 2: Re-run all search queries, capture episode_transcript, extract
 *          snippets, upsert. Also collects audience_size for any new
 *          podcasts encountered.
 *
 * Run via:
 *   DATABASE_URL=... PODSCAN_API_KEY=... node scripts/backfill-podscan-full.js
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const KEY = process.env.PODSCAN_API_KEY;
const BASE = "https://podscan.fm";

const HIGH = [
  '"granola.ai"',
  '"granola.so"',
  '"granola ai"',
  '"chris pedregal"',
  '"granola" AND "pedregal"',
  '"granola" AND "notetaker"',
  '"granola" AND "notetaking"',
  '"granola" AND "notepad"',
  '"granola" AND "AI notes"',
];
const MEDIUM = [
  '"granola" AND "meeting notes"',
  '"granola" AND "meeting"',
  '"granola" AND "productivity"',
  '"granola" AND "transcription"',
  '"using granola"',
  '"i use granola"',
  '"tools like granola"',
  '"granola for"',
];
const HIGH_SET = new Set(HIGH);
const ALL = [...HIGH, ...MEDIUM];

// Premium tier: 120/min = 0.5s between calls. Use 600ms for safety margin.
const DELAY_MS = 600;

async function fetchRetry(url) {
  let wait = 2000;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + KEY } });
    if (r.status !== 429) return r;
    const retryAfter = parseInt(r.headers.get("retry-after") || "0", 10);
    const sleepFor = retryAfter * 1000 || wait;
    console.log(`    429 — waiting ${sleepFor}ms`);
    await new Promise((s) => setTimeout(s, sleepFor));
    wait = Math.min(wait * 2, 60000);
  }
  return null;
}

function extractSnippets(transcript, keyword = "granola", maxChars = 1200) {
  if (!transcript) return null;
  const segments = transcript
    .split(/(?=\[\d+:\d+:\d+\.\d+)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;
  const re = new RegExp(keyword, "i");
  const matchIndices = [];
  for (let i = 0; i < segments.length; i++) {
    if (re.test(segments[i])) matchIndices.push(i);
  }
  if (matchIndices.length === 0) return null;
  const include = new Set();
  for (const idx of matchIndices) {
    if (idx - 1 >= 0) include.add(idx - 1);
    include.add(idx);
    if (idx + 1 < segments.length) include.add(idx + 1);
  }
  const sorted = [...include].sort((a, b) => a - b);
  const groups = [];
  let current = [];
  for (const i of sorted) {
    if (current.length === 0 || i === current[current.length - 1] + 1) current.push(i);
    else {
      groups.push(current);
      current = [i];
    }
  }
  if (current.length) groups.push(current);
  const groupText = groups.map((g) =>
    g
      .map((i) =>
        segments[i].replace(/^\[\d+:\d+:\d+\.\d+\s*-->\s*\d+:\d+:\d+\.\d+\]\s*/, "").trim(),
      )
      .join(" "),
  );
  let result = groupText.join(" ... ");
  if (result.length > maxChars) result = result.slice(0, maxChars) + "...";
  return result;
}

async function searchAll(query) {
  const all = [];
  let lastPage = 1,
    apiTotal = null;
  for (let page = 1; page <= 200; page++) {
    const r = await fetchRetry(
      BASE +
        "/api/v1/episodes/search?query=" +
        encodeURIComponent(query) +
        "&page=" +
        page +
        "&per_page=50",
    );
    if (!r || !r.ok) {
      console.log("  stop at page", page, r?.status);
      break;
    }
    const j = await r.json();
    lastPage = j.pagination?.last_page || page;
    apiTotal = j.pagination?.total ?? apiTotal;
    const eps = j.episodes || [];
    all.push(...eps);
    if (page % 20 === 0)
      console.log("  ...page " + page + "/" + lastPage + " (have " + all.length + ")");
    if (page >= lastPage || eps.length < 50) break;
    await new Promise((s) => setTimeout(s, DELAY_MS));
  }
  return { episodes: all, apiTotal };
}

async function fetchPodcastAudience(podcastId) {
  const r = await fetchRetry(BASE + "/api/v1/podcasts/" + podcastId);
  if (!r || !r.ok) return null;
  const j = await r.json();
  return j.podcast?.reach?.audience_size ?? null;
}

(async () => {
  // ==================================================================
  // Phase 1: Backfill audience_size for podcasts already in our DB
  // ==================================================================
  console.log("=== PHASE 1: Backfill audience_size for existing podcasts ===");
  const uniquePodcasts = await p.$queryRawUnsafe(
    `SELECT podcast_id, MAX(podcast_name) as name
     FROM podscan_mentions
     WHERE podcast_id != 'unknown' AND excluded=false
     GROUP BY podcast_id`,
  );
  console.log(`  ${uniquePodcasts.length} unique podcasts to enrich`);

  const audienceMap = new Map();
  let done = 0;
  for (const pod of uniquePodcasts) {
    const size = await fetchPodcastAudience(pod.podcast_id);
    audienceMap.set(pod.podcast_id, size);
    if (size !== null) {
      await p.podscanMention.updateMany({
        where: { podcastId: pod.podcast_id },
        data: { podcastAudienceSize: size },
      });
    }
    done++;
    if (done % 50 === 0)
      console.log(`  ${done}/${uniquePodcasts.length} — last: ${pod.name} (audience=${size})`);
    await new Promise((s) => setTimeout(s, DELAY_MS));
  }
  const enriched = [...audienceMap.values()].filter((v) => v !== null).length;
  console.log(`  Done: ${enriched}/${uniquePodcasts.length} podcasts got audience_size`);

  // ==================================================================
  // Phase 2: Re-run search queries — capture transcripts + snippets
  // ==================================================================
  console.log();
  console.log("=== PHASE 2: Re-pull search results for snippets ===");
  const matches = new Map();
  for (const q of ALL) {
    const tier = HIGH_SET.has(q) ? "high" : "medium";
    console.log("[" + tier + "] " + q);
    const { episodes, apiTotal } = await searchAll(q);
    console.log("  → fetched " + episodes.length + " of " + apiTotal);
    for (const ep of episodes) {
      if (!ep.episode_id) continue;
      if (!matches.has(ep.episode_id))
        matches.set(ep.episode_id, { ep, queries: new Set([q]) });
      else matches.get(ep.episode_id).queries.add(q);
    }
  }

  console.log();
  console.log("Unique episodes found:", matches.size);

  // Identify NEW podcasts not yet in audienceMap; fetch their audience too
  const newPodcastIds = new Set();
  for (const { ep } of matches.values()) {
    const pid = ep.podcast?.podcast_id;
    if (pid && !audienceMap.has(pid)) newPodcastIds.add(pid);
  }
  console.log(`Fetching audience for ${newPodcastIds.size} newly-seen podcasts...`);
  for (const pid of newPodcastIds) {
    const size = await fetchPodcastAudience(pid);
    audienceMap.set(pid, size);
    await new Promise((s) => setTimeout(s, DELAY_MS));
  }

  // Upsert all matches
  let up = 0,
    err = 0,
    high = 0,
    med = 0,
    snip = 0;
  const now = new Date();
  for (const [episodeId, { ep, queries }] of matches.entries()) {
    try {
      const queryList = [...queries];
      const hasHigh = queryList.some((q) => HIGH_SET.has(q));
      const tier = hasHigh ? "high" : "medium";
      if (hasHigh) high++;
      else med++;
      const podcastId = ep.podcast?.podcast_id || ep.podcast_id || "unknown";
      const snippets = extractSnippets(ep.episode_transcript, "granola");
      if (snippets) snip++;
      const data = {
        podcastId,
        podcastName: ep.podcast?.podcast_name || null,
        podcastReach: ep.podcast?.podcast_reach_score ?? null,
        podcastAudienceSize: audienceMap.get(podcastId) ?? null,
        episodeTitle: ep.episode_title || null,
        episodeUrl: ep.episode_url || null,
        episodeAudioUrl: ep.episode_audio_url || null,
        postedAt: ep.posted_at || null,
        durationSec: ep.episode_duration || null,
        isSponsored: ep.metadata?.is_branded ?? null,
        sponsoredScore: ep.metadata?.is_branded_confidence_score ?? null,
        sponsoredReason: ep.metadata?.is_branded_confidence_reason || null,
        summaryShort: ep.metadata?.summary_short || null,
        summaryLong: ep.metadata?.summary_long || null,
        sentimentLabel: ep.metadata?.sentiment?.label || null,
        sentimentScore: ep.metadata?.sentiment?.score ?? null,
        matchedQuery: queryList[0] || null,
        matchedQueries: queryList.join(", "),
        confidenceTier: tier,
        snippets,
        lastSeenAt: now,
      };
      await p.podscanMention.upsert({
        where: { episodeId },
        create: { episodeId, ...data },
        update: data,
      });
      up++;
      if (up % 100 === 0) console.log(`  upserted ${up}/${matches.size}...`);
    } catch (e) {
      console.log("  ! err on", episodeId, e.message);
      err++;
    }
  }

  console.log();
  console.log(
    `Done: upserted=${up} (${high} high, ${med} medium), snippets=${snip}, errors=${err}`,
  );

  const counts = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*) FILTER (WHERE snippets IS NOT NULL) as with_snippets,
       COUNT(*) FILTER (WHERE podcast_audience_size IS NOT NULL) as with_audience,
       COUNT(*) FILTER (WHERE llm_classification='product') as product,
       COUNT(*)::int as total
     FROM podscan_mentions WHERE excluded=false`,
  );
  console.log(
    "Final DB:",
    JSON.stringify(counts, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
