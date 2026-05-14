/**
 * Backfill for newly-added queries. Pulls full results, extracts snippets,
 * merges into existing rows (updating matched_queries + tier).
 *
 *   DATABASE_URL=... PODSCAN_API_KEY=... node scripts/backfill-new-queries.js
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const KEY = process.env.PODSCAN_API_KEY;
const BASE = "https://podscan.fm";

const NEW_QUERIES = [
  // High-precision additions
  { q: '"granola" AND "Stephenson"', tier: "high" },
  { q: '"granola" AND "MCP"', tier: "high" },
  { q: '"granola app"', tier: "high" },
  { q: '"try granola"', tier: "high" },
  { q: '"granola does"', tier: "high" },
  { q: '"granola" AND "$125 million"', tier: "high" },
  { q: '"granola" AND "$43 million"', tier: "high" },
  { q: '"granola" AND "Series B"', tier: "high" },
  { q: '"granola" AND "Lightspeed"', tier: "high" },
  // Medium-precision additions (competitor co-mentions)
  { q: '"granola" AND "Otter"', tier: "medium" },
  { q: '"granola" AND "Fathom"', tier: "medium" },
  { q: '"granola" AND "Fireflies"', tier: "medium" },
];

const HIGH_SET = new Set([
  '"granola.ai"',
  '"granola.so"',
  '"granola ai"',
  '"chris pedregal"',
  '"granola" AND "pedregal"',
  '"granola" AND "Stephenson"',
  '"granola" AND "notetaker"',
  '"granola" AND "notetaking"',
  '"granola" AND "notepad"',
  '"granola" AND "AI notes"',
  '"granola" AND "AI tool"',
  '"granola" AND "transcript"',
  '"granola" AND "MCP"',
  '"granola app"',
  '"try granola"',
  '"granola does"',
  '"granola" AND "$125 million"',
  '"granola" AND "$43 million"',
  '"granola" AND "Series B"',
  '"granola" AND "Lightspeed"',
]);

async function fetchRetry(url) {
  let wait = 2000;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + KEY } });
    if (r.status !== 429) return r;
    const ra = parseInt(r.headers.get("retry-after") || "0", 10);
    await new Promise((s) => setTimeout(s, (ra * 1000) || wait));
    wait = Math.min(wait * 2, 60000);
  }
  return null;
}

async function searchAll(query) {
  const all = [];
  for (let page = 1; page <= 50; page++) {
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
    const eps = j.episodes || [];
    all.push(...eps);
    if (page >= (j.pagination?.last_page || page) || eps.length < 50) break;
    await new Promise((s) => setTimeout(s, 600));
  }
  return all;
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
    if (current.length === 0 || i === current[current.length - 1] + 1)
      current.push(i);
    else {
      groups.push(current);
      current = [i];
    }
  }
  if (current.length) groups.push(current);
  const groupText = groups.map((g) =>
    g
      .map((i) =>
        segments[i]
          .replace(/^\[\d+:\d+:\d+\.\d+\s*-->\s*\d+:\d+:\d+\.\d+\]\s*/, "")
          .trim(),
      )
      .join(" "),
  );
  let result = groupText.join(" ... ");
  if (result.length > maxChars) result = result.slice(0, maxChars) + "...";
  return result;
}

(async () => {
  const matches = new Map();
  for (const { q } of NEW_QUERIES) {
    console.log("Searching:", q);
    const eps = await searchAll(q);
    console.log("  → fetched " + eps.length);
    for (const ep of eps) {
      if (!ep.episode_id) continue;
      if (!matches.has(ep.episode_id))
        matches.set(ep.episode_id, { ep, queries: new Set([q]) });
      else matches.get(ep.episode_id).queries.add(q);
    }
  }
  console.log();
  console.log("Unique episodes from new queries:", matches.size);

  // For each match, merge with existing row (preserving prior matched_queries)
  let inserted = 0,
    updated = 0,
    err = 0;
  const now = new Date();
  for (const [episodeId, { ep, queries }] of matches.entries()) {
    try {
      const existing = await p.podscanMention.findUnique({
        where: { episodeId },
      });

      // Merge matched_queries (union of old and new)
      const oldQueries = existing?.matchedQueries
        ? existing.matchedQueries.split(",").map((s) => s.trim())
        : [];
      const merged = new Set([...oldQueries, ...queries]);
      const mergedStr = [...merged].join(", ");

      // Tier becomes 'high' if any matched query is high-precision
      const hasHigh = [...merged].some((q) => HIGH_SET.has(q));
      const tier = hasHigh ? "high" : "medium";

      const podcastId = ep.podcast?.podcast_id || ep.podcast_id || "unknown";
      const snippets =
        existing?.snippets ?? extractSnippets(ep.episode_transcript, "granola");

      const data = {
        podcastId,
        podcastName: ep.podcast?.podcast_name ?? existing?.podcastName ?? null,
        podcastReach: ep.podcast?.podcast_reach_score ?? existing?.podcastReach ?? null,
        podcastAudienceSize: existing?.podcastAudienceSize ?? null,
        episodeTitle: ep.episode_title ?? existing?.episodeTitle ?? null,
        episodeUrl: ep.episode_url ?? existing?.episodeUrl ?? null,
        episodeAudioUrl: ep.episode_audio_url ?? existing?.episodeAudioUrl ?? null,
        postedAt: ep.posted_at ?? existing?.postedAt ?? null,
        durationSec: ep.episode_duration ?? existing?.durationSec ?? null,
        isSponsored: ep.metadata?.is_branded ?? existing?.isSponsored ?? null,
        sponsoredScore:
          ep.metadata?.is_branded_confidence_score ?? existing?.sponsoredScore ?? null,
        sponsoredReason:
          ep.metadata?.is_branded_confidence_reason ?? existing?.sponsoredReason ?? null,
        summaryShort: ep.metadata?.summary_short ?? existing?.summaryShort ?? null,
        summaryLong: ep.metadata?.summary_long ?? existing?.summaryLong ?? null,
        sentimentLabel: ep.metadata?.sentiment?.label ?? existing?.sentimentLabel ?? null,
        sentimentScore: ep.metadata?.sentiment?.score ?? existing?.sentimentScore ?? null,
        matchedQuery: existing?.matchedQuery ?? [...queries][0] ?? null,
        matchedQueries: mergedStr,
        confidenceTier: tier,
        snippets,
        lastSeenAt: now,
        // Don't blow away existing classification — let classifier re-run
      };

      if (existing) {
        await p.podscanMention.update({ where: { episodeId }, data });
        updated++;
      } else {
        await p.podscanMention.create({ data: { episodeId, ...data } });
        inserted++;
      }
    } catch (e) {
      console.log("  ! err on", episodeId, e.message);
      err++;
    }
  }

  console.log();
  console.log(`Done: inserted=${inserted} updated=${updated} errors=${err}`);

  // Stats
  const c = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE llm_classification IS NULL) as unclassified,
       COUNT(*) FILTER (WHERE podcast_audience_size IS NULL AND podcast_id != 'unknown') as missing_audience
     FROM podscan_mentions WHERE excluded=false`,
  );
  console.log(
    "DB:",
    JSON.stringify(c, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
