import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function importAllData() {
  console.log("Importing data to production database...");

  const rawData = fs.readFileSync("data/full-export.json", "utf-8");
  const data = JSON.parse(rawData);

  // Clear existing data (in reverse order of dependencies)
  console.log("Clearing existing data...");
  await prisma.contentView.deleteMany();
  await prisma.linkedInEngagement.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.dailyMetric.deleteMany();
  await prisma.importedVideoView.deleteMany();
  await prisma.importedYouTubeVideo.deleteMany();
  await prisma.youTubeSearchResult.deleteMany();

  // Import activities with their relations
  console.log(`Importing ${data.activities.length} activities...`);
  for (const activity of data.activities) {
    const { contentViews, linkedInEngagements, ...activityData } = activity;

    await prisma.activity.create({
      data: {
        ...activityData,
        contentViews: {
          create: contentViews,
        },
        linkedInEngagements: {
          create: linkedInEngagements,
        },
      },
    });
  }

  // Import daily metrics
  console.log(`Importing ${data.dailyMetrics.length} daily metrics...`);
  await prisma.dailyMetric.createMany({
    data: data.dailyMetrics,
  });

  // Import imported videos with views
  console.log(`Importing ${data.importedVideos.length} imported videos...`);
  for (const video of data.importedVideos) {
    const { importedVideoViews, ...videoData } = video;

    await prisma.importedYouTubeVideo.create({
      data: {
        ...videoData,
        importedVideoViews: {
          create: importedVideoViews,
        },
      },
    });
  }

  // Import search results
  console.log(`Importing ${data.searchResults.length} search results...`);
  await prisma.youTubeSearchResult.createMany({
    data: data.searchResults,
  });

  console.log("\nImport complete!");
  await prisma.$disconnect();
}

importAllData().catch(console.error);
