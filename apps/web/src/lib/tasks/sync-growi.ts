/**
 * Growi UGC Sync Task
 *
 * Fetches daily snapshots from Growi API and upserts into growi_daily_snapshots.
 * Pulls the last 30 days of data on each sync to backfill any gaps.
 */

import { prisma } from "../prisma";
import { getSnapshots, getTopPostsByViews } from "../growi";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [Growi] ${msg}`);
}

/** Aggregate per-platform metrics from post-level data for a single day */
async function fetchPlatformMetrics(date: string) {
  try {
    const posts = await getTopPostsByViews(date, date);
    const result = {
      tiktokViews: 0, tiktokLikes: 0, tiktokComments: 0, tiktokShares: 0, tiktokSaves: 0, tiktokPosts: 0,
      instagramViews: 0, instagramLikes: 0, instagramComments: 0, instagramShares: 0, instagramSaves: 0, instagramPosts: 0,
    };
    for (const p of posts) {
      if (p.platform === "tik_tok") {
        result.tiktokViews += p.metrics.views;
        result.tiktokLikes += p.metrics.likes;
        result.tiktokComments += p.metrics.comments;
        result.tiktokShares += p.metrics.shares;
        result.tiktokPosts++;
      } else if (p.platform === "instagram") {
        result.instagramViews += p.metrics.views;
        result.instagramLikes += p.metrics.likes;
        result.instagramComments += p.metrics.comments;
        result.instagramShares += p.metrics.shares;
        result.instagramPosts++;
      }
    }
    return result;
  } catch {
    return null;
  }
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

  // Find days that need platform metrics (non-zero views, missing platform data)
  const existing = await prisma.growiDailySnapshot.findMany({
    where: { date: { gte: startStr, lte: endStr } },
    select: { date: true, tiktokViews: true, instagramViews: true, views: true },
  });
  const existingMap = new Map(existing.map(e => [e.date, e]));

  let upserted = 0;
  let errors = 0;

  for (const snap of snapshots) {
    try {
      // Count posts by platform from content IDs
      const contentIds: string[] = snap.user_content_ids ?? [];
      let tiktokPosts = 0;
      let instagramPosts = 0;
      for (const cid of contentIds) {
        if (cid.startsWith("tik_tok:")) tiktokPosts++;
        else if (cid.startsWith("instagram:")) instagramPosts++;
      }

      // Check if we already have platform metrics for this day
      const ex = existingMap.get(snap.date);
      const needsPlatformMetrics = snap.total_views > 0 && (!ex || (ex.tiktokViews === 0 && ex.instagramViews === 0));

      let platformData = {
        tiktokViews: ex?.tiktokViews ?? 0,
        tiktokLikes: 0, tiktokComments: 0, tiktokShares: 0, tiktokSaves: 0,
        instagramViews: ex?.instagramViews ?? 0,
        instagramLikes: 0, instagramComments: 0, instagramShares: 0, instagramSaves: 0,
      };

      // Only fetch platform metrics for days that need it (last 7 days or missing data)
      const isRecent = snap.date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      if (needsPlatformMetrics || isRecent) {
        const metrics = await fetchPlatformMetrics(snap.date);
        if (metrics) {
          platformData = metrics;
          tiktokPosts = metrics.tiktokPosts;
          instagramPosts = metrics.instagramPosts;
        }
        // Rate limit between API calls
        await new Promise(r => setTimeout(r, 2500));
      }

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
          tiktokPosts,
          tiktokViews: platformData.tiktokViews,
          tiktokLikes: platformData.tiktokLikes,
          tiktokComments: platformData.tiktokComments,
          tiktokShares: platformData.tiktokShares,
          tiktokSaves: platformData.tiktokSaves,
          instagramPosts,
          instagramViews: platformData.instagramViews,
          instagramLikes: platformData.instagramLikes,
          instagramComments: platformData.instagramComments,
          instagramShares: platformData.instagramShares,
          instagramSaves: platformData.instagramSaves,
        },
        update: {
          views: snap.total_views,
          likes: snap.total_likes,
          comments: snap.total_comments,
          shares: snap.total_shares,
          saves: snap.total_saves,
          postsCount: snap.total_posts_count,
          tiktokPosts,
          tiktokViews: platformData.tiktokViews,
          tiktokLikes: platformData.tiktokLikes,
          tiktokComments: platformData.tiktokComments,
          tiktokShares: platformData.tiktokShares,
          tiktokSaves: platformData.tiktokSaves,
          instagramPosts,
          instagramViews: platformData.instagramViews,
          instagramLikes: platformData.instagramLikes,
          instagramComments: platformData.instagramComments,
          instagramShares: platformData.instagramShares,
          instagramSaves: platformData.instagramSaves,
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
