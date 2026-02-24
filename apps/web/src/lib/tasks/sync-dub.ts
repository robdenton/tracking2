/**
 * Dub Analytics Sync Task
 *
 * Fetches daily click counts per short link from Dub.co and stores them in
 * the dub_link_daily table. Designed for cross-reference against sheet-reported
 * actualClicks on newsletter activities.
 *
 * Does NOT modify activities or actualClicks — purely additive.
 *
 * Usage:
 *   - Pipeline trigger: syncDubAnalytics() — syncs last 30 days
 *   - Backfill:         syncDubAnalytics("2025-10-01") — syncs from that date
 */

import { prisma } from "../prisma";

const DUB_API_BASE = "https://api.dub.co";
const CHUNK_DAYS = 30; // keep to ≤30 for daily-bucket granularity
const RATE_LIMIT_DELAY_MS = 200; // polite pause between per-link API calls

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [sync-dub] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] [sync-dub] ERROR: ${msg}`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns YYYY-MM-DD for `n` days before `dateStr` */
function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Adds one day to a YYYY-MM-DD string */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Splits [start, end] into non-overlapping chunks of up to chunkDays each */
function buildChunks(
  start: string,
  end: string,
  chunkDays: number
): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = start;
  while (cursor <= end) {
    const chunkEnd = addDays(cursor, chunkDays - 1) <= end
      ? addDays(cursor, chunkDays - 1)
      : end;
    chunks.push({ start: cursor, end: chunkEnd });
    cursor = addDays(chunkEnd, 1);
  }
  return chunks;
}

interface DubLink {
  id: string;
  shortLink: string;
  url: string;
}

interface DubTimeseriesPoint {
  start: string; // ISO timestamp — slice to YYYY-MM-DD
  clicks: number;
  leads: number;
}

/**
 * Syncs Dub.co click data into dub_link_daily.
 * @param startDate - YYYY-MM-DD to start from. Defaults to 30 days ago.
 */
export async function syncDubAnalytics(startDate?: string): Promise<{
  stored: number;
  errors: number;
}> {
  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) throw new Error("DUB_API_KEY environment variable is not set");

  // 1. Discover all links in the workspace
  log("Fetching links from Dub...");
  const linksRes = await fetch(`${DUB_API_BASE}/links?limit=100`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!linksRes.ok) {
    const body = await linksRes.text();
    throw new Error(`Dub /links returned ${linksRes.status}: ${body}`);
  }
  const links: DubLink[] = await linksRes.json();
  log(`Found ${links.length} links`);

  // 2. Build date range and chunks
  const today = new Date().toISOString().slice(0, 10);
  const rangeStart = startDate ?? subtractDays(today, CHUNK_DAYS);
  const chunks = buildChunks(rangeStart, today, CHUNK_DAYS);
  log(`Syncing ${rangeStart} → ${today} (${chunks.length} chunks × ${links.length} links)`);

  let stored = 0;
  let errors = 0;

  // 3. Per-link, per-chunk: fetch daily timeseries and upsert
  for (const link of links) {
    for (const chunk of chunks) {
      await delay(RATE_LIMIT_DELAY_MS);
      try {
        const url =
          `${DUB_API_BASE}/analytics` +
          `?groupBy=timeseries` +
          `&linkId=${encodeURIComponent(link.id)}` +
          `&start=${chunk.start}` +
          `&end=${chunk.end}` +
          `&event=clicks`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (res.status === 429) {
          // Rate limited — back off and retry once
          log(`Rate limited for ${link.shortLink}, waiting 2s...`);
          await delay(2000);
          const retry = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
          if (!retry.ok) {
            logError(`Retry failed for ${link.shortLink} ${chunk.start}–${chunk.end}: ${retry.status}`);
            errors++;
            continue;
          }
          const points: DubTimeseriesPoint[] = await retry.json();
          for (const point of points) {
            await upsertPoint(link, point);
            stored++;
          }
          continue;
        }

        if (!res.ok) {
          logError(`${link.shortLink} ${chunk.start}–${chunk.end}: ${res.status}`);
          errors++;
          continue;
        }

        const points: DubTimeseriesPoint[] = await res.json();
        for (const point of points) {
          await upsertPoint(link, point);
          stored++;
        }
      } catch (e) {
        logError(`${link.shortLink} ${chunk.start}–${chunk.end}: ${e}`);
        errors++;
      }
    }
  }

  log(`Done. ${stored} rows upserted, ${errors} errors.`);
  return { stored, errors };
}

async function upsertPoint(link: DubLink, point: DubTimeseriesPoint) {
  const date = point.start.slice(0, 10); // ISO → YYYY-MM-DD
  await prisma.dubLinkDaily.upsert({
    where: {
      shortLink_date: { shortLink: link.shortLink, date },
    },
    create: {
      shortLink: link.shortLink,
      url: link.url,
      date,
      clicks: point.clicks,
      leads: point.leads,
    },
    update: {
      clicks: point.clicks,
      leads: point.leads,
    },
  });
}
