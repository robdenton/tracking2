/**
 * Growi UGC Sync Task
 *
 * Fetches daily snapshots from Growi API and upserts into growi_daily_snapshots.
 * Pulls the last 30 days of data on each sync to backfill any gaps.
 */

import { prisma } from "../prisma";
import { getSnapshots } from "../growi";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [Growi] ${msg}`);
}

export async function syncGrowiSnapshots(): Promise<{
  upserted: number;
  errors: number;
}> {
  log("Starting Growi UGC sync...");

  // Fetch last 90 days to backfill
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 90);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  log(`Fetching snapshots from ${startStr} to ${endStr}`);

  const snapshots = await getSnapshots(startStr, endStr);
  log(`Received ${snapshots.length} snapshots`);

  let upserted = 0;
  let errors = 0;

  for (const snap of snapshots) {
    try {
      await prisma.growiDailySnapshot.upsert({
        where: { date: snap.date },
        create: {
          date: snap.date,
          views: snap.total_views,
          likes: snap.total_likes,
          comments: snap.total_comments,
          shares: snap.total_shares,
          saves: snap.total_saves,
          postsCount: snap.total_posts_count,
        },
        update: {
          views: snap.total_views,
          likes: snap.total_likes,
          comments: snap.total_comments,
          shares: snap.total_shares,
          saves: snap.total_saves,
          postsCount: snap.total_posts_count,
        },
      });
      upserted++;
    } catch (err) {
      log(`Failed to upsert ${snap.date}: ${err}`);
      errors++;
    }
  }

  log(`Sync complete: ${upserted} upserted, ${errors} errors`);
  return { upserted, errors };
}
