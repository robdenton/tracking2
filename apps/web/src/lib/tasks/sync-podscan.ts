/**
 * Podscan Sync Task
 *
 * Searches Podscan for podcast episodes mentioning Granola and upserts
 * results into `podscan_mentions`. Both organic and paid mentions are
 * stored — the page filters them on display.
 */

import { prisma } from "../prisma";
import { searchAllEpisodes, PodscanEpisode } from "../podscan";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [Podscan Sync] ${msg}`);
}

// Queries to run. Each catches a different mention pattern:
//   "granola.ai"  → product domain (tracking URLs, show notes, ad reads)
//   "granola ai"  → product name spoken aloud, transcript
//   "granola.so"  → alternative domain (older marketing)
// Podscan caps results at 10,000 per query. For narrow brand queries like
// these we expect a few hundred each — well under the cap, so coverage is
// effectively exhaustive.
const SEARCH_QUERIES = ['"granola.ai"', '"granola ai"', '"granola.so"'];

export interface QueryResult {
  query: string;
  fetched: number;
  apiTotal: number | null;
  truncated: boolean;
}

export async function syncPodscan(): Promise<{
  totalFound: number;
  upserted: number;
  errors: number;
  queryResults: QueryResult[];
}> {
  log("Starting Podscan sync...");

  const dedupe = new Map<string, { ep: PodscanEpisode; query: string }>();
  const queryResults: QueryResult[] = [];

  for (const query of SEARCH_QUERIES) {
    try {
      log(`Searching: ${query}`);
      const { episodes, pagination, truncated } = await searchAllEpisodes({
        query,
        perPage: 50,
        delayMs: 2500,
      });
      queryResults.push({
        query,
        fetched: episodes.length,
        apiTotal: pagination?.total ?? null,
        truncated,
      });
      log(
        `  → fetched ${episodes.length} of ${pagination?.total ?? "?"} reported by API` +
          (truncated ? " [TRUNCATED — increase maxPages]" : "")
      );
      for (const ep of episodes) {
        if (!ep.episode_id) continue;
        if (!dedupe.has(ep.episode_id)) {
          dedupe.set(ep.episode_id, { ep, query });
        }
      }
    } catch (err) {
      log(`  ! Search failed for ${query}: ${(err as Error).message}`);
      queryResults.push({ query, fetched: 0, apiTotal: null, truncated: false });
    }
  }

  log(`Total unique episodes: ${dedupe.size}`);

  let upserted = 0;
  let errors = 0;
  const now = new Date();

  for (const { ep, query } of dedupe.values()) {
    try {
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
        matchedQuery: query,
        lastSeenAt: now,
      };
      await prisma.podscanMention.upsert({
        where: { episodeId: ep.episode_id },
        create: { episodeId: ep.episode_id, ...data },
        update: data,
      });
      upserted++;
    } catch (err) {
      log(`  ! Upsert failed for ${ep.episode_id}: ${(err as Error).message}`);
      errors++;
    }
  }

  log(`Sync complete: ${upserted} upserted, ${errors} errors`);

  return {
    totalFound: dedupe.size,
    upserted,
    errors,
    queryResults,
  };
}
