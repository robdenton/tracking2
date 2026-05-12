/**
 * Podscan Sync Task
 *
 * Searches Podscan with a curated set of queries and upserts every matching
 * episode into `podscan_mentions`. Episodes carry a `confidenceTier`:
 *
 *   high   — matched a high-precision query (almost certainly Granola)
 *   medium — matched only broader queries (possible noise, manual review)
 *
 * Both organic and paid mentions are stored. The page filters them on display.
 */

import { prisma } from "../prisma";
import { searchAllEpisodes, PodscanEpisode, extractSnippets } from "../podscan";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [Podscan Sync] ${msg}`);
}

// High-precision queries: every match is almost certainly about Granola
// (very specific phrases or co-occurrence with the founder's name or
// product-specific terminology like "notepad")
const HIGH_PRECISION_QUERIES = [
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

// Medium-precision queries: broader; most matches are about Granola
// but some food/recipe noise expected. The page filters them to a
// separate "Include broader matches" view.
const MEDIUM_PRECISION_QUERIES = [
  '"granola" AND "meeting notes"',
  '"granola" AND "meeting"',
  '"granola" AND "productivity"',
  '"granola" AND "transcription"',
  '"using granola"',
  '"i use granola"',
  '"tools like granola"',
  '"granola for"',
];

const ALL_QUERIES = [...HIGH_PRECISION_QUERIES, ...MEDIUM_PRECISION_QUERIES];
const HIGH_SET = new Set(HIGH_PRECISION_QUERIES);

export interface QueryResult {
  query: string;
  tier: "high" | "medium";
  fetched: number;
  apiTotal: number | null;
  truncated: boolean;
}

export async function syncPodscan(opts: {
  maxPagesPerQuery?: number;
  delayMs?: number;
} = {}): Promise<{
  totalFound: number;
  upserted: number;
  errors: number;
  highConfidence: number;
  mediumConfidence: number;
  queryResults: QueryResult[];
}> {
  // Cap pages-per-query to fit within the cron's 300s timeout.
  // Daily cron uses tight cap; one-off backfills should pass higher.
  const maxPagesPerQuery = opts.maxPagesPerQuery ?? 50;
  const delayMs = opts.delayMs ?? 2000;

  log(
    `Starting Podscan sync with ${ALL_QUERIES.length} queries ` +
      `(maxPages=${maxPagesPerQuery}, delay=${delayMs}ms)...`
  );

  // episode_id -> { ep_data, set_of_matching_queries }
  const matches = new Map<
    string,
    { ep: PodscanEpisode; queries: Set<string> }
  >();
  const queryResults: QueryResult[] = [];

  for (const query of ALL_QUERIES) {
    const tier = HIGH_SET.has(query) ? "high" : "medium";
    try {
      log(`Searching [${tier}]: ${query}`);
      const { episodes, pagination, truncated } = await searchAllEpisodes({
        query,
        perPage: 50,
        delayMs,
        maxPages: maxPagesPerQuery,
      });
      queryResults.push({
        query,
        tier,
        fetched: episodes.length,
        apiTotal: pagination?.total ?? null,
        truncated,
      });
      log(
        `  → fetched ${episodes.length} of ${pagination?.total ?? "?"}` +
          (truncated ? " [TRUNCATED]" : "")
      );

      for (const ep of episodes) {
        if (!ep.episode_id) continue;
        if (!matches.has(ep.episode_id)) {
          matches.set(ep.episode_id, { ep, queries: new Set([query]) });
        } else {
          matches.get(ep.episode_id)!.queries.add(query);
        }
      }
    } catch (err) {
      log(`  ! Search failed for ${query}: ${(err as Error).message}`);
      queryResults.push({
        query,
        tier,
        fetched: 0,
        apiTotal: null,
        truncated: false,
      });
    }
  }

  log(`Total unique episodes: ${matches.size}`);

  let upserted = 0;
  let errors = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  const now = new Date();

  for (const [episodeId, { ep, queries }] of matches.entries()) {
    try {
      // Confidence tier: high if matched by any high-precision query
      const hasHighMatch = [...queries].some((q) => HIGH_SET.has(q));
      const confidenceTier = hasHighMatch ? "high" : "medium";
      if (hasHighMatch) highConfidence++;
      else mediumConfidence++;

      const podcastId = ep.podcast?.podcast_id ?? ep.podcast_id ?? "unknown";
      const data = {
        podcastId,
        podcastName: ep.podcast?.podcast_name ?? null,
        podcastReach: ep.podcast?.podcast_reach_score ?? null,
        episodeTitle: ep.episode_title ?? null,
        episodeUrl: ep.episode_url ?? null,
        episodeAudioUrl: ep.episode_audio_url ?? null,
        postedAt: ep.posted_at ?? null,
        durationSec: ep.episode_duration ?? null,
        isSponsored: ep.metadata?.is_branded ?? null,
        sponsoredScore: ep.metadata?.is_branded_confidence_score ?? null,
        sponsoredReason: ep.metadata?.is_branded_confidence_reason ?? null,
        summaryShort: ep.metadata?.summary_short ?? null,
        summaryLong: ep.metadata?.summary_long ?? null,
        sentimentLabel: ep.metadata?.sentiment?.label ?? null,
        sentimentScore: ep.metadata?.sentiment?.score ?? null,
        matchedQuery: [...queries][0] ?? null, // first match (legacy field)
        matchedQueries: [...queries].join(", "),
        confidenceTier,
        snippets: extractSnippets(ep.episode_transcript, "granola"),
        lastSeenAt: now,
      };
      await prisma.podscanMention.upsert({
        where: { episodeId },
        create: { episodeId, ...data },
        update: data,
      });
      upserted++;
    } catch (err) {
      log(`  ! Upsert failed for ${episodeId}: ${(err as Error).message}`);
      errors++;
    }
  }

  log(
    `Sync complete: ${upserted} upserted (${highConfidence} high, ${mediumConfidence} medium), ${errors} errors`
  );

  return {
    totalFound: matches.size,
    upserted,
    errors,
    highConfidence,
    mediumConfidence,
    queryResults,
  };
}
