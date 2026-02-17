import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function importFromJSON() {
  console.log("Importing data to production database...");

  // Read exported data
  const activities = JSON.parse(fs.readFileSync("data/activities-export.json", "utf-8"));
  const dailyMetrics = JSON.parse(fs.readFileSync("data/daily-metrics-export.json", "utf-8"));

  // Handle potentially empty files
  let contentViews = [];
  let linkedInEngagements = [];
  try {
    const contentViewsData = fs.readFileSync("data/content-views-export.json", "utf-8").trim();
    contentViews = contentViewsData ? JSON.parse(contentViewsData) : [];
  } catch (e) {
    console.log("No content views data");
  }
  try {
    const linkedInData = fs.readFileSync("data/linkedin-export.json", "utf-8").trim();
    linkedInEngagements = linkedInData ? JSON.parse(linkedInData) : [];
  } catch (e) {
    console.log("No LinkedIn data");
  }

  console.log(`Found:`);
  console.log(`  - ${activities.length} activities`);
  console.log(`  - ${dailyMetrics.length} daily metrics`);
  console.log(`  - ${contentViews.length} content views`);
  console.log(`  - ${linkedInEngagements.length} linkedin engagements`);

  // Clear existing data
  console.log("\nClearing existing data...");
  await prisma.contentView.deleteMany();
  await prisma.linkedInEngagement.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.dailyMetric.deleteMany();

  // Import activities
  console.log("Importing activities...");
  for (const activity of activities) {
    await prisma.activity.create({
      data: {
        id: activity.id,
        activityType: activity.activity_type,
        channel: activity.channel,
        partnerName: activity.partner_name,
        date: activity.date,
        status: activity.status,
        costUsd: activity.cost_usd,
        deterministicClicks: activity.deterministic_clicks,
        actualClicks: activity.actual_clicks,
        deterministicTrackedSignups: activity.deterministic_tracked_signups,
        notes: activity.notes,
        metadata: activity.metadata,
        contentUrl: activity.content_url,
        channelUrl: activity.channel_url,
      },
    });
  }

  // Import daily metrics
  console.log("Importing daily metrics...");
  for (const metric of dailyMetrics) {
    await prisma.dailyMetric.create({
      data: {
        date: metric.date,
        channel: metric.channel,
        signups: metric.signups,
        activations: metric.activations,
      },
    });
  }

  // Import content views
  console.log("Importing content views...");
  for (const view of contentViews) {
    await prisma.contentView.create({
      data: {
        activityId: view.activity_id,
        date: view.date,
        viewCount: view.view_count,
      },
    });
  }

  // Import LinkedIn engagements
  console.log("Importing LinkedIn engagements...");
  for (const engagement of linkedInEngagements) {
    await prisma.linkedInEngagement.create({
      data: {
        activityId: engagement.activity_id,
        date: engagement.date,
        postDate: engagement.post_date,
        likes: engagement.likes,
        comments: engagement.comments,
        reposts: engagement.reposts,
        views: engagement.views,
      },
    });
  }

  console.log("\n✅ Import complete!");
  await prisma.$disconnect();
}

importFromJSON().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
