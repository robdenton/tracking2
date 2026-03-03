/**
 * Transcript Analysis Pipeline — backfill script
 *
 * For every ImportedYouTubeVideo that has not yet been content-analysed:
 *   1. Fetch the YouTube auto-captions via supadata.ai API.
 *   2. Run Claude Haiku structured extraction to produce depth scores,
 *      content-type labels, sentiment, competitor mentions, etc.
 *   3. Persist results to the DB.
 *
 * Fields populated on ImportedYouTubeVideo:
 *   transcriptText, transcriptAvailable, contentAnalysedAt, depthTier,
 *   depthScore, contentType, creatorPersonallyUses, explicitCta,
 *   granolaMinutes, firstMentionPct, mentionCount, sentiment,
 *   competitorsMentioned, targetAudience
 *
 * Note: transcriptText is stored on first successful fetch so future
 * re-analysis runs don't need to re-scrape supadata.
 *
 * Usage:
 *   source .env.prod
 *   export DATABASE_URL ANTHROPIC_API_KEY
 *   npx tsx scripts/analyse-video-transcripts.ts [flags]
 *
 * Flags:
 *   --force      Re-analyse videos that already have contentAnalysedAt set
 *   --dry-run    Fetch transcripts and run LLM but do NOT write to the DB
 *   --limit N    Process at most N videos (useful for spot-checking)
 */

import { PrismaClient } from "@prisma/client";
import {
  fetchTranscript,
  analyseTranscript,
} from "../apps/web/src/lib/transcript-analysis";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_IDX = process.argv.indexOf("--limit");
const LIMIT =
  LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

/** ms to wait between videos — keeps YouTube happy and LLM rate limits safe */
const DELAY_MS = 2_000;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(70));
  console.log("TRANSCRIPT ANALYSIS PIPELINE");
  console.log("=".repeat(70));

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const flagStr = [
    FORCE ? "FORCE" : null,
    DRY_RUN ? "DRY-RUN" : null,
    LIMIT !== Infinity ? `LIMIT=${LIMIT}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  if (flagStr) console.log(`  Flags: ${flagStr}`);

  // -------------------------------------------------------------------------
  // Fetch videos to process
  // -------------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: { in: ["active", "pending"] } };
  if (!FORCE) where.contentAnalysedAt = null;

  const videos = await prisma.importedYouTubeVideo.findMany({
    where,
    select: {
      id: true,
      videoId: true,
      title: true,
      channelTitle: true,
      durationSeconds: true,
      transcriptText: true,  // use cached transcript if already fetched
    },
    orderBy: { createdAt: "asc" },
    ...(LIMIT !== Infinity ? { take: LIMIT } : {}),
  });

  console.log(`\nVideos to analyse: ${videos.length}\n`);

  if (videos.length === 0) {
    console.log(
      "Nothing to do. All videos are already analysed. Use --force to re-analyse.",
    );
    await prisma.$disconnect();
    return;
  }

  // -------------------------------------------------------------------------
  // Process each video
  // -------------------------------------------------------------------------
  let transcriptFound = 0;
  let transcriptMissing = 0;
  let analysed = 0;
  let failed = 0;

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const prefix = `[${i + 1}/${videos.length}]`;
    console.log(`\n${prefix} ${v.title.slice(0, 65)}`);
    console.log(`${"".padEnd(prefix.length + 1)}videoId: ${v.videoId}`);

    // ------------------------------------------------------------------
    // Step 1: Fetch transcript (use cached text if already stored in DB)
    // ------------------------------------------------------------------
    let transcript: string | null = v.transcriptText ?? null;
    if (transcript) {
      console.log(`${"".padEnd(prefix.length + 1)}→ Using cached transcript`);
    } else {
      transcript = await fetchTranscript(v.videoId);
    }

    if (!transcript) {
      console.log(`${"".padEnd(prefix.length + 1)}→ No transcript available`);
      transcriptMissing++;

      if (!DRY_RUN) {
        await prisma.importedYouTubeVideo.update({
          where: { id: v.id },
          data: {
            transcriptAvailable: false,
            contentAnalysedAt: new Date(),
          },
        });
      }

      await sleep(500);
      continue;
    }

    const wordCount = transcript.split(/\s+/).length;
    console.log(
      `${"".padEnd(prefix.length + 1)}→ Transcript: ~${wordCount.toLocaleString()} words`,
    );
    transcriptFound++;

    // ------------------------------------------------------------------
    // Step 2: LLM analysis
    // ------------------------------------------------------------------
    const analysis = await analyseTranscript(
      v.videoId,
      v.title,
      v.channelTitle,
      v.durationSeconds,
      transcript,
    );

    if (!analysis) {
      failed++;
      // Cache the transcript text so we don't re-scrape supadata on the next
      // retry run (contentAnalysedAt stays null so the video is retried).
      if (!DRY_RUN) {
        await prisma.importedYouTubeVideo.update({
          where: { id: v.id },
          data: {
            transcriptAvailable: true,
            transcriptText: transcript,
          },
        });
      }
      await sleep(DELAY_MS);
      continue;
    }

    const pad = "".padEnd(prefix.length + 1);
    console.log(
      `${pad}→ ${analysis.depthTier.toUpperCase().padEnd(10)} score=${analysis.depthScore.toFixed(2)}  ${analysis.contentType}  ${analysis.sentiment}`,
    );
    console.log(
      `${pad}  mentions=${analysis.mentionCount}  firstAt=${analysis.firstMentionPct}%  granolaMin=${analysis.granolaMinutes.toFixed(1)}`,
    );
    console.log(
      `${pad}  personalUse=${analysis.creatorPersonallyUses}  cta=${analysis.explicitCta}  audience=${analysis.targetAudience}`,
    );
    if (analysis.competitorsMentioned.length > 0) {
      console.log(
        `${pad}  competitors: ${analysis.competitorsMentioned.join(", ")}`,
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Persist to DB
    // ------------------------------------------------------------------
    if (!DRY_RUN) {
      await prisma.importedYouTubeVideo.update({
        where: { id: v.id },
        data: {
          transcriptAvailable: true,
          transcriptText: transcript,   // stored so future re-analysis doesn't need to re-scrape
          contentAnalysedAt: new Date(),
          depthTier: analysis.depthTier,
          depthScore: analysis.depthScore,
          contentType: analysis.contentType,
          creatorPersonallyUses: analysis.creatorPersonallyUses,
          explicitCta: analysis.explicitCta,
          granolaMinutes: analysis.granolaMinutes,
          firstMentionPct: analysis.firstMentionPct,
          mentionCount: analysis.mentionCount,
          sentiment: analysis.sentiment,
          competitorsMentioned: JSON.stringify(analysis.competitorsMentioned),
          targetAudience: analysis.targetAudience,
        },
      });
    }

    analysed++;
    await sleep(DELAY_MS);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(70));
  console.log("RESULTS");
  console.log("=".repeat(70));
  console.log(`  Videos processed      : ${videos.length}`);
  console.log(`  Transcripts found     : ${transcriptFound}`);
  console.log(`  Transcripts missing   : ${transcriptMissing}`);
  console.log(`  Successfully analysed : ${analysed}`);
  console.log(`  LLM failures          : ${failed}`);

  if (!DRY_RUN && analysed > 0) {
    const byTier = await prisma.importedYouTubeVideo.groupBy({
      by: ["depthTier"],
      where: { depthTier: { not: null } },
      _count: true,
    });

    console.log("\n  Depth tier distribution (all videos in DB):");
    const order = ["dedicated", "featured", "listed", "incidental"];
    const sorted = byTier.sort(
      (a, b) =>
        order.indexOf(a.depthTier ?? "") - order.indexOf(b.depthTier ?? ""),
    );
    for (const row of sorted) {
      console.log(`    ${(row.depthTier ?? "null").padEnd(12)}: ${row._count}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
