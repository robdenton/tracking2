/**
 * Import historical YouTube view data from a CSV export.
 *
 * CSV format: Video Title, Channel, YouTube URL, <date columns...>, Total Views
 * Daily columns contain incremental views (new views that day).
 * We convert to cumulative by working backwards from Total Views.
 *
 * Run: export $(grep '^DATABASE_URL=' .env.prod | xargs) && npx tsx scripts/import-csv-views.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

const CSV_PATH = process.argv[2] || "/Users/robdenton-ross/Downloads/view-counts-export-2026-03-03.csv";

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      current += ch;
    } else {
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === ",") { fields.push(current.trim()); current = ""; continue; }
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch { /* ignore */ }
  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

async function main() {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const lines = raw.trim().split("\n");
  const headerFields = splitCsvLine(lines[0]);

  // Extract date columns (between "YouTube URL" and "Total Views")
  const dateStartIdx = 3; // first date column
  const dateEndIdx = headerFields.length - 1; // last column is "Total Views"
  const dates = headerFields.slice(dateStartIdx, dateEndIdx);

  console.log(`Found ${dates.length} date columns: ${dates[0]} to ${dates[dates.length - 1]}`);

  let videosCreated = 0;
  let videosExisting = 0;
  let viewsUpserted = 0;
  let viewsSkipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    if (fields.length < 4) continue;

    const title = decodeHtmlEntities(fields[0]);
    const channelTitle = decodeHtmlEntities(fields[1]);
    const url = fields[2];
    const totalViewsStr = fields[dateEndIdx];
    const totalViews = parseInt(totalViewsStr, 10);

    const ytVideoId = extractVideoId(url);
    if (!ytVideoId) {
      console.log(`  SKIP: Cannot extract video ID from ${url}`);
      continue;
    }

    // --- Ensure ImportedYouTubeVideo exists ---
    let video = await prisma.importedYouTubeVideo.findUnique({
      where: { videoId: ytVideoId },
    });

    if (!video) {
      const today = new Date().toISOString().slice(0, 10);
      video = await prisma.importedYouTubeVideo.create({
        data: {
          videoId: ytVideoId,
          title,
          channelTitle,
          channelId: "",
          publishedAt: "",
          url,
          importedDate: today,
          status: "active",
          source: "organic",
        },
      });
      console.log(`  NEW: "${title}" (${ytVideoId})`);
      videosCreated++;
    } else {
      videosExisting++;
    }

    // --- Convert incremental daily views to cumulative ---
    // Parse incremental values
    const increments: (number | null)[] = [];
    for (let d = 0; d < dates.length; d++) {
      const val = fields[dateStartIdx + d];
      if (val === "" || val === undefined) {
        increments.push(null);
      } else {
        const n = parseInt(val, 10);
        increments.push(Number.isNaN(n) ? null : n);
      }
    }

    // Work backwards from totalViews to compute cumulative for each date
    // totalViews is the cumulative as of the LAST date
    const cumulative: (number | null)[] = new Array(dates.length).fill(null);

    // Find the last date with data
    let lastDataIdx = -1;
    for (let d = dates.length - 1; d >= 0; d--) {
      if (increments[d] !== null) { lastDataIdx = d; break; }
    }

    if (lastDataIdx >= 0 && !isNaN(totalViews)) {
      cumulative[lastDataIdx] = totalViews;
      // Walk backwards
      for (let d = lastDataIdx - 1; d >= 0; d--) {
        if (increments[d + 1] !== null && cumulative[d + 1] !== null) {
          cumulative[d] = cumulative[d + 1]! - increments[d + 1]!;
        } else if (cumulative[d + 1] !== null) {
          // No increment data for d+1 — carry back the value
          cumulative[d] = cumulative[d + 1];
        }
      }

      // Null out dates where there was no original data
      for (let d = 0; d < dates.length; d++) {
        if (increments[d] === null) cumulative[d] = null;
      }
    }

    // --- Upsert view records ---
    for (let d = 0; d < dates.length; d++) {
      if (cumulative[d] === null || cumulative[d]! <= 0) {
        viewsSkipped++;
        continue;
      }

      await prisma.importedVideoView.upsert({
        where: {
          videoId_date: {
            videoId: video.id,
            date: dates[d],
          },
        },
        create: {
          videoId: video.id,
          date: dates[d],
          viewCount: cumulative[d]!,
        },
        update: {
          // Only fill blanks — don't overwrite existing tracker data
          viewCount: cumulative[d]!,
        },
      });
      viewsUpserted++;
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  Videos created: ${videosCreated}`);
  console.log(`  Videos already existed: ${videosExisting}`);
  console.log(`  View records upserted: ${viewsUpserted}`);
  console.log(`  View records skipped (no data): ${viewsSkipped}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
