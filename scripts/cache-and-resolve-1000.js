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
  // Get the connection
  const conn = await p.linkedInAdsConnection.findFirst();
  const now = new Date();
  const start = new Date(); start.setDate(now.getDate() - 90);
  const sy = start.getFullYear(), sm = start.getMonth()+1, sd = start.getDate();
  const ey = now.getFullYear(), em = now.getMonth()+1, ed = now.getDate();

  const url = "https://api.linkedin.com/rest/adAnalytics?q=analytics" +
    "&pivot=MEMBER_COMPANY&timeGranularity=ALL" +
    `&dateRange=(start:(year:${sy},month:${sm},day:${sd}),end:(year:${ey},month:${em},day:${ed}))` +
    `&accounts=List(${encodeURIComponent(conn.adAccountId)})` +
    "&fields=impressions,clicks,pivotValues";

  const res = await fetch(url, { headers: {
    "Authorization": "Bearer " + conn.accessToken,
    "LinkedIn-Version": "202503",
    "X-Restli-Protocol-Version": "2.0.0",
  }});
  const data = await res.json();
  const elements = data.elements || [];

  // Get org IDs with >= 1000 impressions
  const over1000 = elements
    .filter(e => (e.impressions || 0) >= 1000)
    .map(e => (e.pivotValues?.[0] || "").split(":").pop())
    .filter(Boolean);

  console.log(`Companies with >=1000 impressions: ${over1000.length}`);

  // Check which are already cached
  const cached = await p.linkedInOrgNameCache.findMany({
    where: { orgId: { in: over1000 } },
    select: { orgId: true, name: true, resolved: true },
  });
  const cachedMap = new Map(cached.map(c => [c.orgId, c]));

  // Find IDs that need creating or resolving
  const needCreate = over1000.filter(id => !cachedMap.has(id));
  const needResolve = over1000.filter(id => {
    const c = cachedMap.get(id);
    return !c || (!c.resolved);
  });

  console.log(`Already cached: ${cached.length}, Need create: ${needCreate.length}, Need resolve: ${needResolve.length}`);

  // Create cache entries
  if (needCreate.length > 0) {
    await p.linkedInOrgNameCache.createMany({
      data: needCreate.map(id => ({ orgId: id, resolved: false })),
      skipDuplicates: true,
    });
    console.log(`Created ${needCreate.length} cache entries`);
  }

  // Resolve all unresolved
  const toResolve = await p.linkedInOrgNameCache.findMany({
    where: { resolved: false },
  });
  console.log(`Resolving ${toResolve.length} names...`);

  let ok = 0, fail = 0;
  for (const entry of toResolve) {
    const name = await lookupCompany(entry.orgId);
    await p.linkedInOrgNameCache.update({
      where: { orgId: entry.orgId },
      data: { name, resolved: true },
    });
    if (name) { ok++; console.log(`  ${entry.orgId} -> ${name}`); }
    else { fail++; process.stdout.write("x"); }
    await sleep(500);
  }
  console.log();
  console.log(`Done! Resolved: ${ok}, Failed: ${fail}`);

  const totalCached = await p.linkedInOrgNameCache.count();
  const totalNamed = await p.linkedInOrgNameCache.count({ where: { name: { not: null } } });
  console.log(`Total cached: ${totalCached}, With names: ${totalNamed}`);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
