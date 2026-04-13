const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

const DSN = "https://api33.unipile.com:16394";
const API_KEY = "ML2GAOYq.71uJ1Y9UR0vkWSFbnBI1buKrvdchqD4R9+z1Z0CHZRo=";
const ACCOUNT_ID = "6keswHDGQ7CRL8WgRlnkjA";

async function lookupCompany(orgId) {
  const res = await fetch(`${DSN}/api/v1/linkedin/company/${orgId}?account_id=${ACCOUNT_ID}`, {
    headers: { "X-API-KEY": API_KEY },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.name || null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  // Get all companies from analytics
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=MEMBER_COMPANY&timeGranularity=ALL` +
    `&dateRange=(start:(year:${start.getFullYear()},month:${start.getMonth()+1},day:${start.getDate()}),end:(year:${end.getFullYear()},month:${end.getMonth()+1},day:${end.getDate()}))` +
    `&accounts=List(${encodeURIComponent(conn.adAccountId)})`;

  const res = await fetch(url, {
    headers: {
      "Authorization": "Bearer " + conn.accessToken,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  });
  const data = await res.json();
  const els = data.elements || [];
  els.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

  // Resolve top 50 companies
  const top = els.slice(0, 50);
  console.log(`Resolving ${top.length} companies via Unipile...\n`);

  const resolved = [];
  for (const el of top) {
    const urn = (el.pivotValues || [])[0] || "";
    const orgId = urn.split(":").pop();
    const name = await lookupCompany(orgId);
    resolved.push({ orgId, urn, name, impressions: el.impressions, clicks: el.clicks });
    console.log(`  ${orgId} -> ${name || "FAILED"} (${el.impressions} imp, ${el.clicks} clicks)`);
    await sleep(300); // rate limit
  }

  console.log(`\nResolved: ${resolved.filter(r => r.name).length}/${resolved.length}`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
