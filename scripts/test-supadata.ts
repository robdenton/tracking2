/**
 * Quick test of the supadata.ai YouTube Transcript API.
 *
 * Usage:
 *   export SUPADATA_API_KEY=your_key_here
 *   npx tsx scripts/test-supadata.ts
 *
 * Tests 3 videos from the DB and prints transcript word counts.
 * Sign up free (100 credits/month, no card) at: https://supadata.ai
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SupadataSegment {
  text: string;
  offset: number;    // ms
  duration: number;  // ms
  lang: string;
}

interface SupadataResponse {
  lang: string;
  content: SupadataSegment[];
}

async function fetchTranscriptSupadata(videoId: string): Promise<string | null> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) throw new Error("SUPADATA_API_KEY not set");

  const url = `https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url, {
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    console.log(`  HTTP ${res.status}: ${body.slice(0, 200)}`);
    return null;
  }

  const data = (await res.json()) as SupadataResponse;

  if (!data.content || data.content.length === 0) return null;

  // Join all segments into plain text
  const text = data.content
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

async function main() {
  if (!process.env.SUPADATA_API_KEY) {
    console.error("ERROR: Set SUPADATA_API_KEY before running.");
    console.error("  Sign up free at https://supadata.ai (no card required)");
    process.exit(1);
  }

  // Pick a sample: one short, one medium, one with known Granola link
  const videos = await prisma.importedYouTubeVideo.findMany({
    where: { status: { in: ["active", "pending"] } },
    select: { videoId: true, title: true, durationSeconds: true, granolaLinkInDesc: true },
    orderBy: { durationSeconds: "asc" },
    take: 5,
  });

  console.log(`Testing supadata.ai on ${videos.length} videos\n`);

  let success = 0;
  for (const v of videos) {
    const mins = v.durationSeconds ? Math.round(v.durationSeconds / 60) : "?";
    console.log(`▶ ${v.title.slice(0, 60)}`);
    console.log(`  videoId=${v.videoId}  duration=${mins}min  granolaLink=${v.granolaLinkInDesc ?? "?"}`);

    const transcript = await fetchTranscriptSupadata(v.videoId);

    if (transcript) {
      const words = transcript.split(/\s+/).length;
      console.log(`  ✓ Got transcript: ~${words.toLocaleString()} words`);
      console.log(`  Preview: "${transcript.slice(0, 120)}..."`);
      success++;
    } else {
      console.log(`  ✗ No transcript returned`);
    }
    console.log();

    // Respect the 1 req/sec free tier rate limit
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\nResult: ${success}/${videos.length} transcripts fetched successfully`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
