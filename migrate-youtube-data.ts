#!/usr/bin/env tsx
/**
 * Migrate YouTube Data from Local to Production
 *
 * This script migrates:
 * 1. ImportedYouTubeVideo records (accepted videos)
 * 2. YouTubeSearchResult records (with accepted/rejected status)
 * 3. ImportedVideoView records (view history for imported videos)
 *
 * Usage:
 *   tsx migrate-youtube-data.ts
 */

import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const localDb = new Database("./prisma/dev.db", { readonly: true });
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "",
    },
  },
});

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function migrateImportedVideos() {
  log("Migrating imported videos...");

  const localVideos = localDb
    .prepare(
      `SELECT id, videoId, title, channel_title as channelTitle,
              channel_id as channelId, publishedAt, url,
              thumbnail_url as thumbnailUrl, importedDate,
              status, related_activity_id as relatedActivityId
       FROM imported_youtube_videos`
    )
    .all() as any[];

  log(`Found ${localVideos.length} imported videos in local database`);

  let created = 0;
  let skipped = 0;

  for (const video of localVideos) {
    // Check if already exists in production
    const existing = await prodPrisma.importedYouTubeVideo.findUnique({
      where: { videoId: video.videoId },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create in production
    await prodPrisma.importedYouTubeVideo.create({
      data: {
        id: video.id,
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        channelId: video.channelId,
        publishedAt: video.publishedAt,
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        importedDate: video.importedDate,
        status: video.status,
        relatedActivityId: video.relatedActivityId,
      },
    });

    created++;
  }

  log(`✅ Imported videos: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function migrateSearchResults() {
  log("Migrating YouTube search results...");

  const localResults = localDb
    .prepare(
      `SELECT id, video_id as videoId, title, channel_title as channelTitle,
              channel_id as channelId, publishedAt, url,
              thumbnail_url as thumbnailUrl, description,
              search_query as searchQuery, search_date as searchDate, status
       FROM youtube_search_results
       WHERE status IN ('accepted', 'rejected')`
    )
    .all() as any[];

  log(`Found ${localResults.length} search results with decisions in local database`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const result of localResults) {
    // Check if already exists in production
    const existing = await prodPrisma.youTubeSearchResult.findFirst({
      where: {
        videoId: result.videoId,
        searchQuery: result.searchQuery,
      },
    });

    if (existing) {
      // Update status if it's still pending in production
      if (existing.status === "pending" && result.status !== "pending") {
        await prodPrisma.youTubeSearchResult.update({
          where: { id: existing.id },
          data: { status: result.status },
        });
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    // Create in production
    await prodPrisma.youTubeSearchResult.create({
      data: {
        id: result.id,
        videoId: result.videoId,
        title: result.title,
        channelTitle: result.channelTitle,
        channelId: result.channelId,
        publishedAt: result.publishedAt,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        description: result.description,
        searchQuery: result.searchQuery,
        searchDate: result.searchDate,
        status: result.status,
      },
    });

    created++;
  }

  log(`✅ Search results: ${created} created, ${updated} updated, ${skipped} skipped`);
  return { created, updated, skipped };
}

async function migrateVideoViews() {
  log("Migrating imported video views...");

  const localViews = localDb
    .prepare(
      `SELECT video_id as videoId, date, view_count as viewCount
       FROM imported_video_views`
    )
    .all() as any[];

  log(`Found ${localViews.length} view records in local database`);

  let created = 0;
  let skipped = 0;

  for (const view of localViews) {
    // Check if video exists in production
    const videoExists = await prodPrisma.importedYouTubeVideo.findUnique({
      where: { id: view.videoId },
    });

    if (!videoExists) {
      // Skip views for videos that don't exist
      skipped++;
      continue;
    }

    // Check if view record already exists
    const existing = await prodPrisma.importedVideoView.findUnique({
      where: {
        videoId_date: {
          videoId: view.videoId,
          date: view.date,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create in production
    await prodPrisma.importedVideoView.create({
      data: {
        videoId: view.videoId,
        date: view.date,
        viewCount: view.viewCount,
      },
    });

    created++;
  }

  log(`✅ Video views: ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  YouTube Data Migration: Local SQLite → Production Postgres  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.includes("postgresql")) {
    console.error("❌ DATABASE_URL must be set to production PostgreSQL");
    process.exit(1);
  }

  log(`Source: ./prisma/dev.db (SQLite)`);
  log(`Target: ${dbUrl.split("@")[1]?.split("/")[0]} (PostgreSQL)`);
  console.log();

  try {
    // Migrate in order: imported videos first, then search results, then views
    const videos = await migrateImportedVideos();
    const searchResults = await migrateSearchResults();
    const views = await migrateVideoViews();

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                   Migration Complete! ✨                      ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("Summary:");
    console.log(`  Imported Videos:    ${videos.created} created, ${videos.skipped} skipped`);
    console.log(`  Search Results:     ${searchResults.created} created, ${searchResults.updated} updated, ${searchResults.skipped} skipped`);
    console.log(`  Video Views:        ${views.created} created, ${views.skipped} skipped`);

    console.log("\n✨ Your YouTube Import page should now show all imported videos!");
    console.log("✨ Past approval decisions (accepted/rejected) have been preserved!");

  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    localDb.close();
    await prodPrisma.$disconnect();
  }
}

main();
