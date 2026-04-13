const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function tryFetch(label, url, token) {
  console.log(`\n--- ${label} ---`);
  console.log("URL:", url);
  const res = await fetch(url, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    }
  });
  const data = await res.json();
  if (!res.ok) {
    console.log("FAILED:", res.status, JSON.stringify(data, null, 2));
    return null;
  }
  console.log("SUCCESS! Elements:", (data.elements || []).length);
  if (data.elements && data.elements[0]) {
    console.log("Sample element keys:", Object.keys(data.elements[0]));
    console.log("Sample:", JSON.stringify(data.elements[0], null, 2).slice(0, 500));
  }
  return data;
}

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const accountUrn = conn.adAccountId;
  const accountId = accountUrn.split(":").pop();
  const token = conn.accessToken;

  // Try different campaign endpoints
  await tryFetch("Campaigns: q=search with account URN",
    `https://api.linkedin.com/rest/adCampaigns?q=search&search.account.values[0]=${encodeURIComponent(accountUrn)}&count=5`,
    token);

  await tryFetch("Campaigns: account finder",
    `https://api.linkedin.com/rest/adCampaigns?q=search&account=${encodeURIComponent(accountUrn)}&count=5`,
    token);

  await tryFetch("Campaigns: no filter (list all)",
    `https://api.linkedin.com/rest/adCampaigns?q=search&count=5`,
    token);

  await tryFetch("Campaigns: using IDs finder",
    `https://api.linkedin.com/rest/adCampaigns?q=search&search=(account:(values:List(${encodeURIComponent(accountUrn)})))&count=5`,
    token);

  // Try campaigns without versioned header
  console.log("\n--- Campaigns: v2 API (non-versioned) ---");
  const v2Res = await fetch(`https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=${encodeURIComponent(accountUrn)}&count=5`, {
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
    }
  });
  const v2Data = await v2Res.json();
  if (!v2Res.ok) {
    console.log("FAILED:", v2Res.status, JSON.stringify(v2Data, null, 2).slice(0, 300));
  } else {
    console.log("SUCCESS! Elements:", (v2Data.elements || []).length);
    if (v2Data.elements && v2Data.elements[0]) {
      console.log("Sample keys:", Object.keys(v2Data.elements[0]));
    }
  }

  // Try analytics without pivotValue field
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  await tryFetch("Analytics: without pivotValue",
    `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=CAMPAIGN&timeGranularity=DAILY` +
    `&dateRange.start.year=${start.getFullYear()}&dateRange.start.month=${start.getMonth()+1}&dateRange.start.day=${start.getDate()}` +
    `&dateRange.end.year=${end.getFullYear()}&dateRange.end.month=${end.getMonth()+1}&dateRange.end.day=${end.getDate()}` +
    `&accounts[0]=${encodeURIComponent(accountUrn)}` +
    `&fields=impressions,clicks,costInLocalCurrency,landingPageClicks,likes,comments,shares,follows,externalWebsiteConversions,dateRange`,
    token);

  await tryFetch("Analytics: with pivotValues (plural)",
    `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=CAMPAIGN&timeGranularity=DAILY` +
    `&dateRange.start.year=${start.getFullYear()}&dateRange.start.month=${start.getMonth()+1}&dateRange.start.day=${start.getDate()}` +
    `&dateRange.end.year=${end.getFullYear()}&dateRange.end.month=${end.getMonth()+1}&dateRange.end.day=${end.getDate()}` +
    `&accounts[0]=${encodeURIComponent(accountUrn)}` +
    `&fields=impressions,clicks,costInLocalCurrency,landingPageClicks,likes,comments,shares,follows,externalWebsiteConversions,dateRange,pivotValues`,
    token);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
