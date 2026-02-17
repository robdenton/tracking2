#!/usr/bin/env tsx
/**
 * Manual YouTube Search Script
 *
 * This script triggers the YouTube search immediately (instead of waiting for cron)
 * to populate the production database with search results.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." tsx manual-youtube-search.ts
 */

import { searchAndSaveYouTubeResults } from "./apps/web/src/lib/tasks/youtube-search";

async function main() {
  console.log("Starting manual YouTube search...");
  console.log(`Database: ${process.env.DATABASE_URL?.includes("postgresql") ? "PostgreSQL (Production)" : "SQLite (Local)"}`);

  try {
    const result = await searchAndSaveYouTubeResults();

    console.log("\n✅ YouTube search completed successfully!");
    console.log(`   Results found: ${result.resultsFound}`);
    console.log(`   Saved: ${result.saved}`);
    console.log(`   Skipped (duplicates): ${result.skipped}`);

    if (result.resultsFound === 0) {
      console.log("\n⚠️  No results found. This could mean:");
      console.log("   - YouTube API key is not configured");
      console.log("   - Search query returned no results");
      console.log("   - YouTube API quota exceeded");
    } else {
      console.log("\n✨ Visit the YouTube Import page to review pending videos!");
    }
  } catch (error) {
    console.error("\n❌ YouTube search failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
