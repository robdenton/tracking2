/**
 * Sync Dub Customers
 *
 * Fetches all customers from the Dub API, looks up their link/partner
 * associations via the /customers/{id}/activity endpoint, and stores
 * the mapping in the dub_customers table.
 *
 * This gives us deterministic user-level attribution:
 *   externalId (Granola UUID) → partner link → partner → group
 */

import { prisma } from "../prisma";

const DUB_API_BASE = "https://api.dub.co";
const WORKSPACE_ID = "ws_cm3mibm7j0001jn08998xpzqp";

const GROUP_NAMES: Record<string, string> = {
  grp_1K9FX244DHYR0S9T19KDQWZMQ: "High Tier",
  grp_1K2QB1G389K2QQADNSANAZEKW: "Default Group",
  grp_1K3NZFKAS951HZZXW76G6QXW7: "Influencer 1mo",
  grp_1K2Z3JXQDBJBGCVYBCFQ7M9M9: "Creators",
  grp_1KFBMT8SDMSZVDZETPKARH03W: "Influencer 3mo",
  grp_1K2Z3MRHQY6JA8EGWMZHTHHZ0: "Audience Owners",
  grp_1K2Z3JT4ARME48KPRPES58SWD: "Specialists",
  grp_1KJQ8XVJJ2VS94Z9NP5QP39Q6: "LinkedIn",
  grp_1KMPAKJR8YVP3B5F5N6V2C6CC: "Tano",
  grp_1KFGCTC243HBE9FK13NRTNJR9: "Unknown Group 1",
  grp_1KHB4B7F3CBS5063S5Y7A8VZA: "Unknown Group 2",
};

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [sync-dub-customers] ${msg}`);
}

export async function syncDubCustomers(batch?: { offset: number; limit: number }): Promise<{
  totalCustomers: number;
  newCustomers: number;
  updatedCustomers: number;
  errors: number;
}> {
  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) throw new Error("DUB_API_KEY not set");

  const headers = { Authorization: `Bearer ${apiKey}` };

  // Step 1: Fetch all partners for partnerId → name/group mapping
  log("Fetching partners for group mapping...");
  const partnerMap = new Map<string, { name: string; groupId: string; groupName: string }>();
  let pPage = 1;
  while (true) {
    const res = await fetch(
      `${DUB_API_BASE}/partners?workspaceId=${WORKSPACE_ID}&limit=100&page=${pPage}`,
      { headers }
    );
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (const p of data) {
      partnerMap.set(p.id, {
        name: p.name || p.email || "Unknown",
        groupId: p.groupId || "",
        groupName: GROUP_NAMES[p.groupId] || p.groupId || "Unknown",
      });
    }
    if (data.length < 100) break;
    pPage++;
    await new Promise((r) => setTimeout(r, 150));
  }
  log(`Loaded ${partnerMap.size} partners`);

  // Step 2: Fetch all customers (paginated)
  log("Fetching all customers...");
  const allCustomers: any[] = [];
  let cPage = 1;
  while (true) {
    const res = await fetch(
      `${DUB_API_BASE}/customers?workspaceId=${WORKSPACE_ID}&limit=100&page=${cPage}`,
      { headers }
    );
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allCustomers.push(...data);
    if (data.length < 100) break;
    cPage++;
    await new Promise((r) => setTimeout(r, 150));
  }
  log(`Found ${allCustomers.length} total customers`);

  // Step 3: Check which customers we already have
  const existingIds = new Set(
    (await prisma.dubCustomer.findMany({ select: { dubCustomerId: true } }))
      .map((c) => c.dubCustomerId)
  );
  log(`Already in DB: ${existingIds.size}`);

  // Only process new customers (ones not yet in our DB)
  let newCustomers = allCustomers.filter((c) => !existingIds.has(c.id));
  log(`New customers to process: ${newCustomers.length}`);

  // If batch mode, slice to the requested range
  if (batch) {
    const start = batch.offset;
    const end = batch.offset + batch.limit;
    log(`Batch mode: processing ${start}-${end} of ${newCustomers.length}`);
    newCustomers = newCustomers.slice(start, end);
    log(`Batch size: ${newCustomers.length}`);
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  // Step 4: For each new customer, fetch their activity to get link association
  for (let i = 0; i < newCustomers.length; i++) {
    const c = newCustomers[i];
    if (!c.externalId) continue; // Skip customers without a Granola user ID

    try {
      const actRes = await fetch(
        `${DUB_API_BASE}/customers/${c.id}/activity?workspaceId=${WORKSPACE_ID}`,
        { headers }
      );
      const activity = await actRes.json();

      const link = activity.link || {};
      const partnerId = link.partnerId || "";
      const partnerInfo = partnerMap.get(partnerId);

      await prisma.dubCustomer.upsert({
        where: { dubCustomerId: c.id },
        create: {
          dubCustomerId: c.id,
          externalId: c.externalId,
          country: c.country || null,
          linkKey: link.key || null,
          linkDomain: link.domain || null,
          shortLink: link.shortLink || null,
          partnerId: partnerId || null,
          partnerName: partnerInfo?.name || null,
          groupId: partnerInfo?.groupId || null,
          groupName: partnerInfo?.groupName || null,
          dubCreatedAt: c.createdAt ? new Date(c.createdAt) : null,
        },
        update: {
          linkKey: link.key || null,
          linkDomain: link.domain || null,
          shortLink: link.shortLink || null,
          partnerId: partnerId || null,
          partnerName: partnerInfo?.name || null,
          groupId: partnerInfo?.groupId || null,
          groupName: partnerInfo?.groupName || null,
          syncedAt: new Date(),
        },
      });
      created++;
    } catch (err) {
      errors++;
    }

    if ((i + 1) % 100 === 0) {
      log(`Processed ${i + 1} / ${newCustomers.length}`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  log(`Done: ${created} created, ${updated} updated, ${errors} errors`);

  return {
    totalCustomers: allCustomers.length,
    newCustomers: created,
    updatedCustomers: updated,
    errors,
  };
}
