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

// Queries to run. "granola.ai" is the most specific (matches the product
// domain in show notes / tracking URLs). "granola ai" catches transcript
// mentions of the product name spelled out.
const SEARCH_QUERIES = ['"granola.ai"', '"granola ai"'];

export async function syncPodscan(): Promise<{
  totalFound: number;
  upserted: number;
  errors: number;
  byQuery: Record<string, number>;
}> {
  log("Starting Podscan sync...");

  const dedupe = new Map<string, { ep: PodscanEpisode; query: string }>();
  const byQuery: Record<string, number> = {};

  for (const query of SEARCH_QUERIES) {
    try {
      log(`Searching: ${query}`);
      const episodes = await searchAllEpisodes({
        query,
        maxPages: 15,
        perPage: 20,
        delayMs: 2500,
      });
      byQuery[query] = episodes.length;
      log(`  → ${episodes.length} episodes`);
      for (const ep of episodes) {
        if (!ep.episode_id) continue;
        // Keep first hit's query; later matches are duplicates we'd dedupe anyway
        if (!dedupe.has(ep.episode_id)) {
          dedupe.set(ep.episode_id, { ep, query });
        }
      }
    } catch (err) {
      log(`  ! Search failed for ${query}: ${(err as Error).message}`);
      byQuery[query] = -1;
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
    byQuery,
  };
}
