/**
 * One-off backfill script — imports historical Dub.co click data.
 *
 * Usage:
 *   npx tsx scripts/backfill-dub.ts [startDate]
 *
 * Examples:
 *   npx tsx scripts/backfill-dub.ts              # defaults to 2025-10-01
 *   npx tsx scripts/backfill-dub.ts 2025-09-01   # custom start date
 *
 * Requires DUB_API_KEY and DATABASE_URL (production Neon URL) in environment.
 * Run from the project root.
 */

import { syncDubAnalytics } from "../apps/web/src/lib/tasks/sync-dub";

const DEFAULT_START_DATE = "2025-10-01";

const startDate = process.argv[2] ?? DEFAULT_START_DATE;

console.log(`Starting Dub backfill from ${startDate}...`);
console.log("This may take a few minutes — fetching per-link daily data in 30-day chunks.\n");

syncDubAnalytics(startDate)
  .then(({ stored, errors }) => {
    console.log(`\nBackfill complete.`);
    console.log(`  Rows upserted: ${stored}`);
    console.log(`  Errors:        ${errors}`);
    process.exit(errors > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
