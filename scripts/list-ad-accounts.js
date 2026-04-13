const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  // List all ad accounts (remove active-only filter to see all)
  const res = await fetch("https://api.linkedin.com/rest/adAccounts?q=search&count=100", {
    headers: {
      "Authorization": "Bearer " + conn.accessToken,
      "LinkedIn-Version": "202503",
      "X-Restli-Protocol-Version": "2.0.0",
    }
  });
  const data = await res.json();
  console.log("Ad Accounts found:", (data.elements || []).length);
  for (const el of (data.elements || [])) {
    console.log("  -", el.id, "|", el.name, "|", el.status, "| urn:li:sponsoredAccount:" + el.id);
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
