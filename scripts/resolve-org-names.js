const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const token = conn.accessToken;
  const accountUrn = conn.adAccountId;

  // Get top 20 companies by impressions
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=MEMBER_COMPANY` +
    `&timeGranularity=ALL` +
    `&dateRange=(start:(year:${start.getFullYear()},month:${start.getMonth()+1},day:${start.getDate()}),end:(year:${end.getFullYear()},month:${end.getMonth()+1},day:${end.getDate()}))` +
    `&accounts=List(${encodeURIComponent(accountUrn)})`;

  const res = await fetch(url, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  });
  const data = await res.json();
  const els = data.elements || [];
  els.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

  // Get top 20 org URNs
  const topOrgs = els.slice(0, 20);
  const orgIds = topOrgs.map(el => {
    const urn = (el.pivotValues || [])[0] || "";
    return urn.split(":").pop();
  }).filter(Boolean);

  console.log("Top 20 org IDs:", orgIds.join(","));

  // Try to resolve org names via LinkedIn API
  for (const orgId of orgIds.slice(0, 20)) {
    try {
      const orgRes = await fetch(`https://api.linkedin.com/rest/organizations/${orgId}`, {
        headers: {
          "Authorization": "Bearer " + token,
          "LinkedIn-Version": "202503",
          "X-Restli-Protocol-Version": "2.0.0",
        }
      });
      const orgData = await orgRes.json();
      const el = topOrgs.find(e => (e.pivotValues || [])[0] === `urn:li:organization:${orgId}`);
      if (orgRes.ok) {
        console.log(`  ${orgData.localizedName || orgData.name || "?"} (${orgId}) — ${el.impressions} imp, ${el.clicks} clicks`);
      } else {
        console.log(`  [org:${orgId}] — ${el.impressions} imp, ${el.clicks} clicks (name lookup failed: ${orgRes.status})`);
      }
    } catch (err) {
      console.log(`  [org:${orgId}] — lookup error: ${err.message}`);
    }
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
