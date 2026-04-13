const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function tryPivot(label, pivot, token, accountUrn, granularity, daysBack) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);

  const url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics` +
    `&pivot=${pivot}` +
    `&timeGranularity=${granularity}` +
    `&dateRange=(start:(year:${start.getFullYear()},month:${start.getMonth()+1},day:${start.getDate()}),end:(year:${end.getFullYear()},month:${end.getMonth()+1},day:${end.getDate()}))` +
    `&accounts=List(${encodeURIComponent(accountUrn)})`;

  console.log(`\n--- ${label} (${granularity}, ${daysBack}d) ---`);
  const res = await fetch(url, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  });
  const data = await res.json();
  if (!res.ok) {
    console.log("FAILED:", res.status, JSON.stringify(data).slice(0, 400));
    return;
  }
  const els = data.elements || [];
  console.log("Rows:", els.length);
  if (els.length > 0 && els[0]) {
    console.log("Keys:", Object.keys(els[0]).join(", "));
    // Show top entries by impressions
    els.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    for (const el of els.slice(0, 10)) {
      const pv = el.pivotValues || el.pivotValue || "?";
      const dr = el.dateRange;
      const dateStr = dr ? `${dr.start.year}-${String(dr.start.month).padStart(2,'0')}-${String(dr.start.day).padStart(2,'0')}` : "";
      console.log(`  ${dateStr} | ${JSON.stringify(pv)} | imp: ${el.impressions}, clicks: ${el.clicks}, spend: $${Number(el.costInLocalCurrency || 0).toFixed(2)}`);
    }
    if (els.length > 10) console.log(`  ... and ${els.length - 10} more`);
  }
}

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const token = conn.accessToken;
  const accountUrn = conn.adAccountId;
  console.log("Account:", accountUrn);

  // Baseline: CAMPAIGN with 30 days - this worked before
  await tryPivot("CAMPAIGN", "CAMPAIGN", token, accountUrn, "DAILY", 30);

  // Company pivots with 30 days
  await tryPivot("MEMBER_COMPANY", "MEMBER_COMPANY", token, accountUrn, "ALL", 30);
  await tryPivot("MEMBER_COMPANY", "MEMBER_COMPANY", token, accountUrn, "DAILY", 30);
  await tryPivot("COMPANY", "COMPANY", token, accountUrn, "ALL", 30);

  // Other demographic pivots with 30 days
  await tryPivot("MEMBER_COMPANY_SIZE", "MEMBER_COMPANY_SIZE", token, accountUrn, "ALL", 30);
  await tryPivot("MEMBER_INDUSTRY", "MEMBER_INDUSTRY", token, accountUrn, "ALL", 30);
  await tryPivot("MEMBER_SENIORITY", "MEMBER_SENIORITY", token, accountUrn, "ALL", 30);
  await tryPivot("MEMBER_COUNTRY_V2", "MEMBER_COUNTRY_V2", token, accountUrn, "ALL", 30);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
