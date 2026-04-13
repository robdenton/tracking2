const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  const conn = await p.linkedInAdsConnection.findFirst();
  if (!conn) { console.log("No connection"); return; }

  const updated = await p.linkedInAdsConnection.update({
    where: { id: conn.id },
    data: {
      adAccountId: "urn:li:sponsoredAccount:517703517",
      adAccountName: "Granola",
    }
  });
  console.log("Updated connection:");
  console.log("  adAccountId:", updated.adAccountId);
  console.log("  adAccountName:", updated.adAccountName);
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
