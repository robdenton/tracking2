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
const RATE_LIMIT_DELAY_MS = 50; // polite pause between per-link API calls

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
export async function syncDubAnalytics(startDate?: string, batchIndex?: number, batchSize?: number): Promise<{
  stored: number;
  errors: number;
  totalLinks?: number;
  batchIndex?: number;
}> {
  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) throw new Error("DUB_API_KEY environment variable is not set");

  // 1. Discover ALL links on go.granola.ai domain (paginated)
  // This captures both workspace links and partner links in one pass
  log("Fetching all links from Dub (paginated)...");
  const linkMap = new Map<string, DubLink>();
  let page = 1;
  while (true) {
    const linksRes = await fetch(
      `${DUB_API_BASE}/links?domain=go.granola.ai&limit=100&page=${page}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!linksRes.ok) {
      const body = await linksRes.text();
      throw new Error(`Dub /links page ${page} returned ${linksRes.status}: ${body}`);
    }
    const pageLinks: DubLink[] = await linksRes.json();
    if (!Array.isArray(pageLinks) || pageLinks.length === 0) break;
    for (const l of pageLinks) linkMap.set(l.id, l);
    log(`  Page ${page}: ${pageLinks.length} links (total: ${linkMap.size})`);
    if (pageLinks.length < 100) break;
    page++;
    await delay(RATE_LIMIT_DELAY_MS);
  }
  const allLinks = Array.from(linkMap.values());
  log(`Total unique links discovered: ${allLinks.length}`);

  // Apply batching if requested
  const bs = batchSize ?? allLinks.length;
  const bi = batchIndex ?? 0;
  const links = allLinks.slice(bi * bs, (bi + 1) * bs);
  if (batchSize) {
    log(`Batch ${bi}: processing links ${bi * bs}–${bi * bs + links.length - 1} of ${allLinks.length}`);
  }

  // 2. Build date range and chunks
  const today = new Date().toISOString().slice(0, 10);
  const rangeStart = startDate ?? subtractDays(today, CHUNK_DAYS);
  const chunks = buildChunks(rangeStart, today, CHUNK_DAYS);
  log(`Syncing ${rangeStart} → ${today} (${chunks.length} chunks × ${links.length} links)`);

  let stored = 0;
  let errors = 0;

  // 3. Per-link, per-chunk: fetch daily timeseries for both clicks and leads
  const events = ["clicks", "leads"] as const;
  for (const event of events) {
    log(`Fetching ${event} timeseries...`);
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
            `&event=${event}`;

          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });

          if (res.status === 429) {
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
              await upsertPoint(link, point, event);
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
            await upsertPoint(link, point, event);
            stored++;
          }
        } catch (e) {
          logError(`${link.shortLink} ${chunk.start}–${chunk.end}: ${e}`);
          errors++;
        }
      }
    }
  }

  log(`Done. ${stored} rows upserted, ${errors} errors. (${links.length}/${allLinks.length} links processed)`);
  return { stored, errors, totalLinks: allLinks.length, batchIndex: bi };
}

async function upsertPoint(link: DubLink, point: DubTimeseriesPoint, event: "clicks" | "leads") {
  const date = point.start.slice(0, 10); // ISO → YYYY-MM-DD
  const value = event === "clicks" ? (point.clicks ?? 0) : (point.leads ?? 0);
  await prisma.dubLinkDaily.upsert({
    where: {
      shortLink_date: { shortLink: link.shortLink, date },
    },
    create: {
      shortLink: link.shortLink,
      url: link.url,
      date,
      clicks: event === "clicks" ? value : 0,
      leads: event === "leads" ? value : 0,
    },
    update: {
      [event]: value,
    },
  });
}
