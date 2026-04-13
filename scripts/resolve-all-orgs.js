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
  const unresolved = await p.linkedInOrgNameCache.findMany({ where: { resolved: false } });
  console.log(`Resolving ${unresolved.length} companies...`);
  let ok = 0, fail = 0;
  for (const entry of unresolved) {
    const name = await lookupCompany(entry.orgId);
    await p.linkedInOrgNameCache.update({
      where: { orgId: entry.orgId },
      data: { name, resolved: true },
    });
    if (name) { ok++; process.stdout.write("."); }
    else { fail++; process.stdout.write("x"); }
    await sleep(300);
  }
  console.log();
  console.log(`Done! Resolved: ${ok}, Failed: ${fail}`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
