const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }
  const token = conn.accessToken;
  const accountId = conn.adAccountId.split(":").pop();

  // Try looking up org name via the ad targeting search
  // This endpoint is available with r_ads scope
  const orgIds = ["1586", "1063", "10667", "22688", "675562"];

  for (const orgId of orgIds) {
    // Try batch GET on adTargetingEntities
    const url = `https://api.linkedin.com/rest/adAccounts/${accountId}/adTargetingEntities/${encodeURIComponent("urn:li:organization:" + orgId)}?facet=urn:li:adTargetingFacet:employers`;
    const res = await fetch(url, {
      headers: {
        "Authorization": "Bearer " + token,
        "LinkedIn-Version": "202503",
        "X-Restli-Protocol-Version": "2.0.0",
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`org:${orgId} -> ${data.name || data.localizedName || JSON.stringify(data).slice(0, 200)}`);
    } else {
      const data = await res.json();
      console.log(`org:${orgId} -> FAILED ${res.status}: ${data.message || JSON.stringify(data).slice(0, 100)}`);
    }
  }

  // Try the search endpoint
  console.log("\n--- typeahead search ---");
  const searchUrl = `https://api.linkedin.com/rest/adAccounts/${accountId}/adTargetingEntities?q=adTargetingFacet&adTargetingFacet=urn:li:adTargetingFacet:employers&searchTerm=Amazon&count=3`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      "Authorization": "Bearer " + token,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  });
  const searchData = await searchRes.json();
  if (searchRes.ok) {
    console.log("Results:", (searchData.elements || []).length);
    for (const el of (searchData.elements || []).slice(0, 5)) {
      console.log(`  ${el.urn} -> ${el.name}`);
    }
  } else {
    console.log("FAILED:", searchRes.status, JSON.stringify(searchData).slice(0, 300));
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
