const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const accountUrn = conn.adAccountId;
  const token = conn.accessToken;
  console.log("Testing with account:", accountUrn, conn.adAccountName);

  // Test 1: Fetch campaigns
  console.log("\n--- Fetching campaigns ---");
  const campaignsUrl = `https://api.linkedin.com/rest/adCampaigns?q=search&search.account.values[0]=${encodeURIComponent(accountUrn)}&start=0&count=10`;
  const campaignsRes = await fetch(campaignsUrl, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    }
  });
  const campaignsData = await campaignsRes.json();

  if (!campaignsRes.ok) {
    console.log("Campaigns FAILED:", campaignsRes.status, JSON.stringify(campaignsData, null, 2));
  } else {
    const els = campaignsData.elements || [];
    console.log("Campaigns found:", els.length);
    for (const el of els.slice(0, 5)) {
      console.log("  -", el.id, "|", el.name, "|", el.status, "|", el.type);
    }
    if (els.length > 5) console.log("  ... and", els.length - 5, "more");
  }

  // Test 2: Fetch analytics (last 30 days)
  console.log("\n--- Fetching analytics (last 30 days) ---");
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const analyticsUrl = `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=CAMPAIGN&timeGranularity=DAILY` +
    `&dateRange.start.year=${start.getFullYear()}&dateRange.start.month=${start.getMonth()+1}&dateRange.start.day=${start.getDate()}` +
    `&dateRange.end.year=${end.getFullYear()}&dateRange.end.month=${end.getMonth()+1}&dateRange.end.day=${end.getDate()}` +
    `&accounts[0]=${encodeURIComponent(accountUrn)}` +
    `&fields=impressions,clicks,costInLocalCurrency,landingPageClicks,likes,comments,shares,follows,externalWebsiteConversions,dateRange,pivotValue`;

  const analyticsRes = await fetch(analyticsUrl, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    }
  });
  const analyticsData = await analyticsRes.json();

  if (!analyticsRes.ok) {
    console.log("Analytics FAILED:", analyticsRes.status, JSON.stringify(analyticsData, null, 2));
  } else {
    const els = analyticsData.elements || [];
    console.log("Analytics rows:", els.length);
    // Show a sample
    for (const el of els.slice(0, 3)) {
      const dr = el.dateRange;
      const dateStr = dr ? `${dr.start.year}-${String(dr.start.month).padStart(2,'0')}-${String(dr.start.day).padStart(2,'0')}` : "?";
      console.log("  -", dateStr, "| campaign:", el.pivotValue, "| imp:", el.impressions, "| clicks:", el.clicks, "| spend:", el.costInLocalCurrency);
    }
    if (els.length > 3) console.log("  ... and", els.length - 3, "more rows");
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
