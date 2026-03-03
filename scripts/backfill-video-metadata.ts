/**
 * Backfill full YouTube metadata for all ImportedYouTubeVideo records.
 *
 * Fetches description, duration, likeCount, commentCount from the YouTube
 * Data API v3 (videos.list), then parses each description for Granola links
 * and sponsored disclosure markers.
 *
 * Safe to re-run: always overwrites with freshest data from the API.
 *
 * Usage:
 *   source .env.prod && export DATABASE_URL && export YOUTUBE_API_KEY
 *   npx tsx scripts/backfill-video-metadata.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  fetchVideoMetadata,
  detectGranolaLink,
  detectSponsoredDisclosure,
} from "../apps/web/src/lib/youtube-metadata";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(70));
  console.log("BACKFILL: YouTube video metadata");
  console.log("=".repeat(70));

  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY environment variable is not set");
  }

  // Fetch all active + pending imported videos
  const videos = await prisma.importedYouTubeVideo.findMany({
    where: { status: { in: ["active", "pending"] } },
    select: { id: true, videoId: true, title: true },
  });

  console.log(`\nFound ${videos.length} videos to enrich\n`);

  // Fetch metadata in batches of 50 (one API call per batch = 1 quota unit)
  const videoIds = videos.map((v) => v.videoId);
  console.log(
    `Fetching metadata in ${Math.ceil(videoIds.length / 50)} batch(es) from YouTube API...`,
  );

  const metadata = await fetchVideoMetadata(videoIds);
  console.log(`  API returned data for ${metadata.size} / ${videoIds.length} videos`);
  console.log(`  (Missing videos may have been deleted or made private)\n`);

  // Update each video
  let updated = 0;
  let granolaLinkCount = 0;
  let trackedLinkCount = 0;
  let sponsoredCount = 0;
  let missingFromApi = 0;

  for (const video of videos) {
    const meta = metadata.get(video.videoId);

    if (!meta) {
      console.log(`  ⚠  ${video.videoId} — not returned by API (deleted/private?)`);
      missingFromApi++;
      continue;
    }

    const desc = meta.description ?? "";
    const granolaLink = detectGranolaLink(desc);
    const sponsored = detectSponsoredDisclosure(desc);

    await prisma.importedYouTubeVideo.update({
      where: { id: video.id },
      data: {
        description: meta.description,
        durationSeconds: meta.durationSeconds,
        likeCount: meta.likeCount,
        commentCount: meta.commentCount,
        granolaLinkInDesc: granolaLink.granolaLinkInDesc,
        granolaLinkType: granolaLink.granolaLinkType,
        sponsoredDisclosure: sponsored,
      },
    });

    updated++;
    if (granolaLink.granolaLinkInDesc) {
      granolaLinkCount++;
      if (granolaLink.granolaLinkType === "tracked") trackedLinkCount++;
      console.log(
        `  ✓ ${video.title.slice(0, 55).padEnd(55)} → link=${granolaLink.granolaLinkType}${sponsored ? " #ad" : ""}`,
      );
    }
    if (sponsored && !granolaLink.granolaLinkInDesc) {
      sponsoredCount++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("RESULTS");
  console.log("=".repeat(70));
  console.log(`  Total videos processed : ${updated}`);
  console.log(`  Missing from API       : ${missingFromApi}`);
  console.log(`  Granola link in desc   : ${granolaLinkCount}`);
  console.log(`    — tracked (UTM/ref)  : ${trackedLinkCount}`);
  console.log(`    — direct             : ${granolaLinkCount - trackedLinkCount}`);
  console.log(`  Sponsored disclosure   : ${sponsoredCount}`);

  // Summary of newly captured data
  const withDesc = await prisma.importedYouTubeVideo.count({
    where: { description: { not: null } },
  });
  const withDuration = await prisma.importedYouTubeVideo.count({
    where: { durationSeconds: { not: null } },
  });
  const withGranolaLink = await prisma.importedYouTubeVideo.count({
    where: { granolaLinkInDesc: true },
  });

  console.log("\n  DB state after backfill:");
  console.log(`    Videos with description  : ${withDesc}`);
  console.log(`    Videos with duration     : ${withDuration}`);
  console.log(`    Videos with Granola link : ${withGranolaLink}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
