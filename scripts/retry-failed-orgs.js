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
  // Get all failed (resolved but no name)
  const failed = await p.linkedInOrgNameCache.findMany({
    where: { resolved: true, name: null },
  });
  console.log(`Retrying ${failed.length} previously failed companies (with 500ms delay)...`);

  let ok = 0, still_failed = 0;
  for (const entry of failed) {
    const name = await lookupCompany(entry.orgId);
    if (name) {
      await p.linkedInOrgNameCache.update({
        where: { orgId: entry.orgId },
        data: { name },
      });
      ok++;
      console.log(`  ${entry.orgId} -> ${name}`);
    } else {
      still_failed++;
      process.stdout.write("x");
    }
    await sleep(500);
  }
  console.log();
  console.log(`Done! Newly resolved: ${ok}, Still failed: ${still_failed}`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
