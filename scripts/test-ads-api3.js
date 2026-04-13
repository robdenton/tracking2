const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function tryFetch(label, url, token, versioned = true) {
  console.log(`\n--- ${label} ---`);
  const headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
  };
  if (versioned) {
    headers["LinkedIn-Version"] = "202503";
    headers["X-Restli-Protocol-Version"] = "2.0.0";
  }
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (!res.ok) {
    console.log("FAILED:", res.status, JSON.stringify(data, null, 2).slice(0, 500));
    return null;
  }
  console.log("SUCCESS! Elements:", (data.elements || []).length);
  if (data.elements && data.elements[0]) {
    console.log("Sample keys:", Object.keys(data.elements[0]).join(", "));
    console.log("Sample:", JSON.stringify(data.elements[0], null, 2).slice(0, 600));
  }
  return data;
}

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const accountUrn = conn.adAccountId;
  const accountId = accountUrn.split(":").pop();
  const token = conn.accessToken;
  console.log("Account:", accountId, conn.adAccountName);

  // Campaigns: nested under adAccounts (versioned API)
  await tryFetch("Campaigns: nested versioned",
    `https://api.linkedin.com/rest/adAccounts/${accountId}/adCampaigns?q=search&count=5`,
    token, true);

  // Analytics: nested under adAccounts (versioned API)
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  await tryFetch("Analytics: nested versioned with RestLI format",
    `https://api.linkedin.com/rest/adAccounts/${accountId}/adAnalytics?q=analytics` +
    `&pivot=CAMPAIGN&timeGranularity=DAILY` +
    `&dateRange=(start:(year:${start.getFullYear()},month:${start.getMonth()+1},day:${start.getDate()}),end:(year:${end.getFullYear()},month:${end.getMonth()+1},day:${end.getDate()}))` +
    `&fields=impressions,clicks,costInLocalCurrency,landingPageClicks,likes,comments,shares,follows,externalWebsiteConversions,dateRange,pivotValues`,
    token, true);

  // Analytics v2 (non-versioned) with RestLI format
  await tryFetch("Analytics: v2 non-versioned",
    `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics` +
    `&pivot=CAMPAIGN&timeGranularity=DAILY` +
    `&dateRange=(start:(year:${start.getFullYear()},month:${start.getMonth()+1},day:${start.getDate()}),end:(year:${end.getFullYear()},month:${end.getMonth()+1},day:${end.getDate()}))` +
    `&accounts=List(${encodeURIComponent(accountUrn)})` +
    `&fields=impressions,clicks,costInLocalCurrency,landingPageClicks,likes,comments,shares,follows,externalWebsiteConversions,dateRange,pivotValue`,
    token, false);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
