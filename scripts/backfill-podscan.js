/**
 * One-off Podscan backfill with full pagination + snippet extraction.
 * Run via:
 *   DATABASE_URL=... PODSCAN_API_KEY=... node scripts/backfill-podscan.js
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

async function fetchRetry(url) {
  let wait = 2000;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, {
      headers: { Authorization: "Bearer " + KEY },
    });
    if (r.status !== 429) return r;
    await new Promise((s) => setTimeout(s, wait));
    wait = Math.min(wait * 2, 30000);
  }
  return null;
}

async function searchAll(query) {
  const all = [];
  let lastPage = 1;
  let apiTotal = null;
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
      console.log(
        "  ...page " + page + "/" + lastPage + " (have " + all.length + ")",
      );
    if (page >= lastPage || eps.length < 50) break;
    await new Promise((s) => setTimeout(s, 2500));
  }
  return { episodes: all, apiTotal };
}

// Snippet extractor — mirrors apps/web/src/lib/podscan.ts:extractSnippets
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
    if (current.length === 0 || i === current[current.length - 1] + 1) {
      current.push(i);
    } else {
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
  for (const q of ALL) {
    const tier = HIGH_SET.has(q) ? "high" : "medium";
    console.log("[" + tier + "] " + q);
    const { episodes, apiTotal } = await searchAll(q);
    console.log("  → fetched " + episodes.length + " of " + apiTotal);
    for (const ep of episodes) {
      if (!ep.episode_id) continue;
      if (!matches.has(ep.episode_id)) {
        matches.set(ep.episode_id, { ep, queries: new Set([q]) });
      } else {
        matches.get(ep.episode_id).queries.add(q);
      }
    }
  }

  console.log();
  console.log("Unique episodes:", matches.size);

  let up = 0,
    err = 0,
    high = 0,
    med = 0,
    snippets_extracted = 0;
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
      if (snippets) snippets_extracted++;
      const data = {
        podcastId,
        podcastName: ep.podcast?.podcast_name || null,
        podcastReach: ep.podcast?.podcast_reach_score || null,
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
      if (up % 100 === 0)
        console.log(`  upserted ${up}/${matches.size}...`);
    } catch (e) {
      console.log("  ! err on", episodeId, e.message);
      err++;
    }
  }

  console.log();
  console.log(
    "Done: upserted=" +
      up +
      " (" +
      high +
      " high, " +
      med +
      " medium) snippets=" +
      snippets_extracted +
      " errors=" +
      err,
  );

  const counts = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*) FILTER (WHERE confidence_tier='high') as high,
       COUNT(*) FILTER (WHERE confidence_tier='medium') as medium,
       COUNT(*) FILTER (WHERE snippets IS NOT NULL) as with_snippets,
       COUNT(*) FILTER (WHERE llm_classification IS NULL) as unclassified,
       COUNT(*)::int as total
     FROM podscan_mentions WHERE excluded=false`,
  );
  console.log(
    "Final DB counts:",
    JSON.stringify(counts, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
