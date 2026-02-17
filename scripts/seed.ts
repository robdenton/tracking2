/**
 * Seed script: reads CSVs from /data and loads them into SQLite via Prisma.
 * Usage: npx tsx scripts/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

function parseCsvRows(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function intOrNull(val: string): number | null {
  if (!val || val === "") return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

async function seedActivities(csvPath: string) {
  const content = readFileSync(csvPath, "utf-8");
  const rows = parseCsvRows(content);

  // Clear existing
  await prisma.activity.deleteMany();

  let count = 0;
  for (const row of rows) {
    await prisma.activity.create({
      data: {
        id: row["id"] || undefined,
        activityType: row["activity_type"],
        channel: row["channel"],
        partnerName: row["partner_name"],
        date: row["date"],
        status: row["status"] || "live",
        costUsd: row["cost_usd"] ? parseFloat(row["cost_usd"]) : null,
        deterministicClicks: intOrNull(row["deterministic_clicks"]),
        deterministicTrackedSignups: intOrNull(
          row["deterministic_tracked_signups"],
        ),
        notes: row["notes"] || null,
        metadata: row["metadata"] || null,
        contentUrl: row["content_url"] || null,
        channelUrl: row["channel_url"] || null,
      },
    });
    count++;
  }
  console.log(`Seeded ${count} activities from ${csvPath}`);
}

async function seedDailyMetrics(csvPath: string) {
  const content = readFileSync(csvPath, "utf-8");
  const rows = parseCsvRows(content);

  // Clear existing
  await prisma.dailyMetric.deleteMany();

  let count = 0;
  for (const row of rows) {
    await prisma.dailyMetric.create({
      data: {
        date: row["date"],
        channel: row["channel"],
        signups: parseInt(row["signups"], 10),
        activations: parseInt(row["activations"], 10),
      },
    });
    count++;
  }
  console.log(`Seeded ${count} daily metrics from ${csvPath}`);
}

async function main() {
  const root = resolve(__dirname, "..");
  const activitiesPath =
    process.env.ACTIVITIES_CSV_PATH || "data/activities.csv";
  const metricsPath =
    process.env.DAILY_METRICS_CSV_PATH || "data/daily_metrics.csv";

  await seedActivities(resolve(root, activitiesPath));
  await seedDailyMetrics(resolve(root, metricsPath));

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
