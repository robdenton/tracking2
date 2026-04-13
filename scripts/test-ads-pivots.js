const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function tryPivot(label, pivot, token, accountUrn) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=${pivot}` +
    `&timeGranularity=ALL` +
    `&dateRange=(start:(year:${start.getFullYear()},month:${start.getMonth()+1},day:${start.getDate()}),end:(year:${end.getFullYear()},month:${end.getMonth()+1},day:${end.getDate()}))` +
    `&accounts=List(${encodeURIComponent(accountUrn)})` +
    `&fields=impressions,clicks,costInLocalCurrency,pivotValues`;

  console.log(`\n--- Pivot: ${pivot} ---`);
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
    console.log("FAILED:", res.status, JSON.stringify(data).slice(0, 300));
    return;
  }
  const els = data.elements || [];
  console.log("SUCCESS! Rows:", els.length);
  // Show top 10 by impressions
  els.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  for (const el of els.slice(0, 10)) {
    console.log(`  ${(el.pivotValues || []).join(", ")} — imp: ${el.impressions}, clicks: ${el.clicks}, spend: ${el.costInLocalCurrency}`);
  }
  if (els.length > 10) console.log(`  ... and ${els.length - 10} more`);
}

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const token = conn.accessToken;
  const accountUrn = conn.adAccountId;

  // Try company-related pivots
  const pivots = [
    "MEMBER_COMPANY",
    "COMPANY",
    "MEMBER_COMPANY_SIZE",
    "MEMBER_INDUSTRY",
    "MEMBER_JOB_TITLE",
    "MEMBER_JOB_FUNCTION",
    "MEMBER_SENIORITY",
    "MEMBER_COUNTRY_V2",
  ];

  for (const pivot of pivots) {
    await tryPivot(pivot, pivot, token, accountUrn);
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
