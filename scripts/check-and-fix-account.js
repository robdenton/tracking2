const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: "postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  // Check all connections
  const connections = await p.linkedInAdsConnection.findMany();
  console.log("Total connections:", connections.length);
  for (const c of connections) {
    console.log(`  id=${c.id} account=${c.adAccountId} name=${c.adAccountName} by=${c.connectedBy}`);
  }

  // Update to Granola if needed
  if (connections.length > 0) {
    const conn = connections[0];
    if (conn.adAccountId !== "urn:li:sponsoredAccount:517703517") {
      console.log("\nUpdating to Granola...");
      await p.linkedInAdsConnection.update({
        where: { id: conn.id },
        data: {
          adAccountId: "urn:li:sponsoredAccount:517703517",
          adAccountName: "Granola",
        }
      });
      console.log("Done! Verifying...");
      const updated = await p.linkedInAdsConnection.findFirst();
      console.log(`  account=${updated.adAccountId} name=${updated.adAccountName}`);
    } else {
      console.log("Already set to Granola");
    }
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
