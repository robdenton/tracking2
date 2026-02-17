/**
 * Test script to create sample LinkedIn activities for testing
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_POSTS = [
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7421522750340595714/",
    partnerName: "Test Partner 1",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:ugcPost:7424065670700572672/",
    partnerName: "Test Partner 2",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:share:7422574625731145728/",
    partnerName: "Test Partner 3",
  },
];

async function main() {
  console.log("Creating test LinkedIn activities...\n");

  for (const post of SAMPLE_POSTS) {
    const activity = await prisma.activity.create({
      data: {
        activityType: "linkedin_post",
        channel: "linkedin",
        partnerName: post.partnerName,
        date: "2026-02-10", // A week ago
        status: "live",
        contentUrl: post.url,
        notes: "Test post for LinkedIn engagement tracking",
      },
    });

    console.log(`✓ Created: ${activity.partnerName} (${activity.id})`);
    console.log(`  URL: ${activity.contentUrl}\n`);
  }

  console.log("Test setup complete!");
  console.log("\nNext steps:");
  console.log("1. Run: npm run track-linkedin");
  console.log("2. Check database: sqlite3 prisma/dev.db \"SELECT * FROM linkedin_engagements;\"");
  console.log("3. View in UI: npm run dev, then visit activity pages");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
