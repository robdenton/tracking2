import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function exportAllData() {
  console.log("Exporting all data from local database...");

  const activities = await prisma.activity.findMany({
    include: {
      contentViews: true,
      linkedInEngagements: true,
    },
  });

  const dailyMetrics = await prisma.dailyMetric.findMany();
  const importedVideos = await prisma.importedYouTubeVideo.findMany({
    include: {
      importedVideoViews: true,
    },
  });
  const searchResults = await prisma.youTubeSearchResult.findMany();

  const data = {
    activities,
    dailyMetrics,
    importedVideos,
    searchResults,
  };

  fs.writeFileSync(
    "data/full-export.json",
    JSON.stringify(data, null, 2)
  );

  console.log(`Exported:`);
  console.log(`  - ${activities.length} activities`);
  console.log(`  - ${dailyMetrics.length} daily metrics`);
  console.log(`  - ${importedVideos.length} imported videos`);
  console.log(`  - ${searchResults.length} search results`);
  console.log(`\nData saved to data/full-export.json`);

  await prisma.$disconnect();
}

exportAllData().catch(console.error);
