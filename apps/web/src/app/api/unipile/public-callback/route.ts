import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listAccounts } from "@/lib/unipile";
import { syncAccountPosts } from "@/lib/tasks/sync-employee-linkedin";

/**
 * Public callback — Unipile redirects here after LinkedIn auth completes.
 * No session required. Matches the newest unclaimed Unipile account to
 * the most recent pending team-member record.
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") || "Unknown";

  try {
    // Find the most recent pending record for this team member
    const pendingRecord = await prisma.unipileLinkedInAccount.findFirst({
      where: {
        teamMemberName: name,
        userId: null,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!pendingRecord) {
      console.warn(`[Public Callback] No pending record for name="${name}"`);
      return NextResponse.redirect(
        new URL("/connect-linkedin?connected=0&reason=no_pending", request.url)
      );
    }

    // List all Unipile accounts
    const unipileAccounts = await listAccounts();

    // Get all Unipile account IDs already claimed in our DB
    const claimedRecords = await prisma.unipileLinkedInAccount.findMany({
      where: {
        NOT: [{ unipileAccountId: { startsWith: "pending-" } }],
        status: { in: ["connected", "pending"] },
        id: { not: pendingRecord.id },
      },
      select: { unipileAccountId: true },
    });
    const claimedIds = new Set(claimedRecords.map((r) => r.unipileAccountId));

    // Find unclaimed LINKEDIN accounts
    const unclaimed = unipileAccounts.filter(
      (a) => !claimedIds.has(a.id) && (a.provider === "LINKEDIN" || !a.provider)
    );

    if (unclaimed.length === 0) {
      console.warn(`[Public Callback] No unclaimed Unipile account found`);
      return NextResponse.redirect(
        new URL("/connect-linkedin?connected=0&reason=no_match", request.url)
      );
    }

    // Pick the most recently created unclaimed account
    const sorted = [...unclaimed].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    const match = sorted[0];

    const linkedinId = match.connection_params?.im?.id ?? null;

    // Update the pending record
    await prisma.unipileLinkedInAccount.update({
      where: { id: pendingRecord.id },
      data: {
        unipileAccountId: match.id,
        linkedinId,
        linkedinName: match.name ?? null,
        status: "connected",
        connectedAt: new Date(),
      },
    });

    console.log(
      `[Public Callback] Connected: unipile=${match.id}, linkedin=${linkedinId}, name=${name}`
    );

    // Trigger initial sync (fire-and-forget)
    syncAccountPosts(match.id).catch((err) =>
      console.error(`[Public Callback] Initial sync failed for ${match.id}:`, err)
    );

    return NextResponse.redirect(
      new URL("/connect-linkedin?connected=1", request.url)
    );
  } catch (err) {
    console.error("[Public Callback] Error:", err);
    return NextResponse.redirect(
      new URL("/connect-linkedin?connected=0&reason=error", request.url)
    );
  }
}
