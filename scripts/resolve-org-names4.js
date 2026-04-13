const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function tryUrl(label, url, token, versioned) {
  const headers = { "Authorization": "Bearer " + token };
  if (versioned) {
    headers["LinkedIn-Version"] = "202503";
    headers["X-Restli-Protocol-Version"] = "2.0.0";
  }
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (res.ok) {
    console.log(`${label}: SUCCESS`);
    const els = data.elements || [];
    if (els.length > 0) {
      for (const el of els.slice(0, 5)) {
        console.log(`  ${el.urn || el.id} -> ${el.name || el.localizedName || "?"}`);
      }
    } else {
      console.log("  ", JSON.stringify(data).slice(0, 300));
    }
  } else {
    console.log(`${label}: FAILED ${res.status} - ${data.message || JSON.stringify(data).slice(0, 200)}`);
  }
}

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }
  const token = conn.accessToken;

  // Try various approaches
  await tryUrl("v2 adTargetingEntities search",
    "https://api.linkedin.com/v2/adTargetingEntities?q=adTargetingFacet&adTargetingFacet=urn:li:adTargetingFacet:employers&searchTerm=Meta&count=3",
    token, false);

  await tryUrl("v2 adTargetingFacets GET employers",
    "https://api.linkedin.com/v2/adTargetingFacets/employers",
    token, false);

  await tryUrl("REST adTargetingEntities search (top-level)",
    "https://api.linkedin.com/rest/adTargetingEntities?q=adTargetingFacet&adTargetingFacet=urn:li:adTargetingFacet:employers&searchTerm=Google&count=3",
    token, true);

  // Try batch GET with the BATCH_GET format
  await tryUrl("REST adTargetingEntities batch",
    "https://api.linkedin.com/rest/adTargetingEntities?ids=List(urn:li:adTargetingFacet:employers-urn:li:organization:1586)",
    token, true);

  // Try using the organizationsLookup endpoint
  await tryUrl("REST organizationsLookup",
    "https://api.linkedin.com/rest/organizations?ids=List(1586,1063,10667)",
    token, true);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
