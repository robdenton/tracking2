import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getLinkedInAdsCompanyStats,
  ensureOrgCacheEntries,
  resolveUnresolvedOrgNames,
} from "@/lib/data";

/**
 * POST /api/linkedin-ads/resolve-companies
 *
 * Fetches company analytics, ensures cache entries exist for all org IDs,
 * then resolves any unresolved names via Unipile.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch current company analytics to discover org IDs
    const companies = await getLinkedInAdsCompanyStats();
    const orgIds = companies.map((c) => c.orgId).filter(Boolean);

    // Ensure all org IDs have cache entries
    const newEntries = await ensureOrgCacheEntries(orgIds);

    // Resolve unresolved names (up to 50 at a time)
    const { resolved, failed } = await resolveUnresolvedOrgNames(50);

    return NextResponse.json({
      totalCompanies: companies.length,
      newCacheEntries: newEntries,
      resolved,
      failed,
    });
  } catch (error) {
    console.error("Error resolving companies:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
