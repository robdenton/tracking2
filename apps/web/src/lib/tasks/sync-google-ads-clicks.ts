/**
 * Daily sync of Google Ads ClickView for the previous day.
 *
 * Designed to run in the daily Vercel cron. Pulls yesterday's clicks (the
 * most recent day with stable data) and bulk-inserts into google_ads_clicks
 * with skipDuplicates. ClickView attribution doesn't change after the click,
 * so we don't need to update existing rows.
 */

import { prisma } from "../prisma";
import { fetchClickViewForDay, clickViewToRow } from "../google-ads";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [GAds Sync] ${msg}`);
}

export interface SyncResult {
  day: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: number;
}

export async function syncGoogleAdsClicks(opts: {
  day?: string; // YYYY-MM-DD; defaults to yesterday (UTC)
} = {}): Promise<SyncResult> {
  const day =
    opts.day ??
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  log(`Fetching ClickView for ${day}...`);
  const raw = await fetchClickViewForDay(day, { delayMs: 250 });
  log(`Fetched ${raw.length} rows; bulk-inserting...`);

  const records = raw.map(clickViewToRow).filter((r) => r.gclid && r.campaignId);

  let inserted = 0;
  let errors = 0;
  const BATCH = 1000;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    try {
      const res = await prisma.googleAdsClick.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += res.count;
    } catch (err) {
      log(`  ! batch err at offset ${i}: ${(err as Error).message.slice(0, 200)}`);
      errors++;
    }
  }
  const skipped = records.length - inserted;
  log(`Done: ${inserted} new, ${skipped} already-existed, ${errors} batch errors`);

  return { day, fetched: raw.length, inserted, skipped, errors };
}
