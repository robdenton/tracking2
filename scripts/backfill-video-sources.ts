/**
 * One-time backfill: tag existing ImportedYouTubeVideo records as
 * "organic" or "paid_sponsorship" based on matching Activity.contentUrl.
 *
 * Run: npx tsx scripts/backfill-video-sources.ts
 * (uses DATABASE_URL from .env.prod via --env-file or export)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch { /* ignore */ }
  return null;
}

async function main() {
  // Get all YouTube activities with content URLs
  const ytActivities = await prisma.activity.findMany({
    where: { channel: "youtube", contentUrl: { not: null } },
    select: { id: true, contentUrl: true, partnerName: true },
  });

  const paidVideoIds = new Map<string, { activityId: string; partner: string }>();
  for (const act of ytActivities) {
    if (!act.contentUrl) continue;
    const vid = extractVideoId(act.contentUrl);
    if (vid) paidVideoIds.set(vid, { activityId: act.id, partner: act.partnerName });
  }

  console.log(`Found ${paidVideoIds.size} YouTube activities with video IDs`);

  // Get all imported videos
  const videos = await prisma.importedYouTubeVideo.findMany({
    select: { id: true, videoId: true, title: true, source: true },
  });

  console.log(`Found ${videos.length} imported videos to check\n`);

  let updated = 0;
  for (const video of videos) {
    const match = paidVideoIds.get(video.videoId);
    const newSource = match ? "paid_sponsorship" : "organic";

    if (video.source !== newSource) {
      await prisma.importedYouTubeVideo.update({
        where: { id: video.id },
        data: {
          source: newSource,
          relatedActivityId: match?.activityId ?? null,
        },
      });
      console.log(
        `  ${video.source} → ${newSource}: "${video.title}"${match ? ` (partner: ${match.partner})` : ""}`
      );
      updated++;
    }
  }

  console.log(`\nDone. Updated ${updated} of ${videos.length} videos.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
