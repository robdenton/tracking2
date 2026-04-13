const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function tryPivot(label, pivot, token, accountUrn, granularity, fieldsParam) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  let url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=${pivot}` +
    `&timeGranularity=${granularity}` +
    `&dateRange=(start:(year:${start.getFullYear()},month:${start.getMonth()+1},day:${start.getDate()}),end:(year:${end.getFullYear()},month:${end.getMonth()+1},day:${end.getDate()}))` +
    `&accounts=List(${encodeURIComponent(accountUrn)})`;

  if (fieldsParam) url += `&fields=${fieldsParam}`;

  console.log(`\n--- ${label} (${granularity}, fields=${fieldsParam || 'none'}) ---`);
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
    console.log("FAILED:", res.status, JSON.stringify(data).slice(0, 400));
    return;
  }
  const els = data.elements || [];
  console.log("Rows:", els.length);
  if (els[0]) {
    console.log("Keys:", Object.keys(els[0]).join(", "));
  }
  // Show top 5 by impressions
  els.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  for (const el of els.slice(0, 5)) {
    const pv = el.pivotValues || el.pivotValue || el.pivot || "?";
    console.log(`  ${JSON.stringify(pv)} — imp: ${el.impressions}, clicks: ${el.clicks}`);
  }
  if (els.length > 5) console.log(`  ... and ${els.length - 5} more`);
}

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const token = conn.accessToken;
  const accountUrn = conn.adAccountId;

  // First verify CAMPAIGN pivot works (our baseline)
  await tryPivot("CAMPAIGN (baseline)", "CAMPAIGN", token, accountUrn, "DAILY", "impressions,clicks,dateRange,pivotValues");

  // Now try company pivots with DAILY and no fields
  await tryPivot("MEMBER_COMPANY", "MEMBER_COMPANY", token, accountUrn, "DAILY", null);
  await tryPivot("MEMBER_COMPANY (ALL)", "MEMBER_COMPANY", token, accountUrn, "ALL", null);

  // Try COMPANY pivot
  await tryPivot("COMPANY (DAILY)", "COMPANY", token, accountUrn, "DAILY", null);
  await tryPivot("COMPANY (ALL)", "COMPANY", token, accountUrn, "ALL", null);

  // Try other demographic pivots
  await tryPivot("MEMBER_COMPANY_SIZE (ALL)", "MEMBER_COMPANY_SIZE", token, accountUrn, "ALL", null);
  await tryPivot("MEMBER_INDUSTRY (ALL)", "MEMBER_INDUSTRY", token, accountUrn, "ALL", null);
  await tryPivot("MEMBER_SENIORITY (ALL)", "MEMBER_SENIORITY", token, accountUrn, "ALL", null);
  await tryPivot("MEMBER_COUNTRY_V2 (ALL)", "MEMBER_COUNTRY_V2", token, accountUrn, "ALL", null);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
