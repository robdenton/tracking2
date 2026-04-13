const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }
  const token = conn.accessToken;
  const accountUrn = conn.adAccountId;

  // Get top companies
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

  const top20 = els.slice(0, 20);
  const orgUrns = top20.map(el => (el.pivotValues || [])[0]).filter(Boolean);

  // Try adTargetingEntities to resolve names
  console.log("\n--- Try 1: adTargetingEntities ---");
  const urnsList = orgUrns.map(u => encodeURIComponent(u)).join(",");
  const teUrl = `https://api.linkedin.com/rest/adTargetingEntities?ids=List(${orgUrns.map(u => encodeURIComponent(u)).join(",")})`;
  const teRes = await fetch(teUrl, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  });
  const teData = await teRes.json();
  if (!teRes.ok) {
    console.log("FAILED:", teRes.status, JSON.stringify(teData).slice(0, 400));
  } else {
    console.log("Keys:", Object.keys(teData).join(", "));
    console.log("Sample:", JSON.stringify(teData).slice(0, 500));
  }

  // Try v2 organizations batch
  console.log("\n--- Try 2: v2 organizations (batch) ---");
  const idsParam = orgUrns.map(u => `ids=${encodeURIComponent(u)}`).join("&");
  const orgBatchUrl = `https://api.linkedin.com/v2/organizations?${idsParam}&projection=(elements*(id,localizedName))`;
  const orgBatchRes = await fetch(orgBatchUrl, {
    headers: { "Authorization": "Bearer " + token }
  });
  const orgBatchData = await orgBatchRes.json();
  if (!orgBatchRes.ok) {
    console.log("FAILED:", orgBatchRes.status, JSON.stringify(orgBatchData).slice(0, 400));
  } else {
    console.log("Sample:", JSON.stringify(orgBatchData).slice(0, 500));
  }

  // Try v2 organizationsByVanityName or just batch GET
  console.log("\n--- Try 3: v2 single organization lookup ---");
  const singleOrg = await fetch(`https://api.linkedin.com/v2/organizations/1586`, {
    headers: { "Authorization": "Bearer " + token }
  });
  const singleOrgData = await singleOrg.json();
  if (!singleOrg.ok) {
    console.log("FAILED:", singleOrg.status, JSON.stringify(singleOrgData).slice(0, 400));
  } else {
    console.log("Name:", singleOrgData.localizedName || singleOrgData.name);
    console.log("Keys:", Object.keys(singleOrgData).join(", "));
  }

  // Try adTargetingFacets approach
  console.log("\n--- Try 4: adTargetingEntities with facet ---");
  const facetUrl = `https://api.linkedin.com/rest/adTargetingEntities?q=adTargetingFacet&adTargetingFacet=urn:li:adTargetingFacet:employers&ids=List(${orgUrns.slice(0,5).map(u => encodeURIComponent(u)).join(",")})`;
  const facetRes = await fetch(facetUrl, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  });
  const facetData = await facetRes.json();
  if (!facetRes.ok) {
    console.log("FAILED:", facetRes.status, JSON.stringify(facetData).slice(0, 400));
  } else {
    console.log("Elements:", (facetData.elements || []).length);
    for (const el of (facetData.elements || []).slice(0, 5)) {
      console.log("  ", el.urn || el.id, "->", el.name || el.localizedName || JSON.stringify(el).slice(0, 100));
    }
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
