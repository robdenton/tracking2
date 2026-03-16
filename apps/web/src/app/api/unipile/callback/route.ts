import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAccounts } from "@/lib/unipile";
import { syncAccountPosts } from "@/lib/tasks/sync-employee-linkedin";

/**
 * Callback route — Unipile redirects here after successful LinkedIn auth.
 *
 * Matching strategy: list all Unipile accounts, filter out ones already
 * linked in our DB, and pick the one with the most recent created_at
 * timestamp (i.e. the account just created by this auth flow).
 *
 * Previous bug: used list position (last item) which could pick an orphaned
 * account from earlier connect/disconnect cycles instead of the new one.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    console.warn("[Unipile Callback] No session, redirecting to page");
    return NextResponse.redirect(new URL("/build-in-public", request.url));
  }

  const email = session.user.email;
  console.log(`[Unipile Callback] Processing callback for ${email}`);

  try {
    // Find the user's pending record (could be new or reused disconnected)
    const pendingRecord = await prisma.unipileLinkedInAccount.findFirst({
      where: { userId: session.user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    if (!pendingRecord) {
      console.warn(
        `[Unipile Callback] No pending record found for user ${email}`
      );
      return NextResponse.redirect(
        new URL("/build-in-public?connected=0&reason=no_pending", request.url)
      );
    }

    // List all Unipile accounts
    const unipileAccounts = await listAccounts();
    console.log(
      `[Unipile Callback] Found ${unipileAccounts.length} Unipile accounts`
    );

    // Get all Unipile account IDs already claimed in our DB (connected or pending)
    const claimedRecords = await prisma.unipileLinkedInAccount.findMany({
      where: {
        NOT: [
          { unipileAccountId: { startsWith: "pending-" } },
          { id: pendingRecord.id }, // exclude current user's own pending record
        ],
        status: { in: ["connected", "pending"] },
      },
      select: { unipileAccountId: true },
    });
    const claimedIds = new Set(claimedRecords.map((r) => r.unipileAccountId));

    // Find unclaimed LINKEDIN accounts
    const unclaimed = unipileAccounts.filter(
      (a) =>
        !claimedIds.has(a.id) && (a.provider === "LINKEDIN" || !a.provider)
    );

    console.log(
      `[Unipile Callback] ${unclaimed.length} unclaimed accounts: ${unclaimed.map((a) => `${a.id}(${a.name}, created=${a.created_at})`).join(", ")}`
    );

    // Pick the best match by priority:
    // 1. If user had a previous linkedinId (reconnecting), match on that
    // 2. Otherwise, pick the account with the most recent created_at
    //    (the one just created by this auth flow)
    let match: (typeof unclaimed)[number] | undefined;

    if (pendingRecord.linkedinId) {
      match = unclaimed.find(
        (a) => a.connection_params?.im?.id === pendingRecord.linkedinId
      );
    }

    if (!match && unclaimed.length > 0) {
      // Sort by created_at descending — newest first
      const sorted = [...unclaimed].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      match = sorted[0];

      console.log(
        `[Unipile Callback] Picked newest account: ${match.id} (${match.name}, created=${match.created_at})`
      );
    }

    if (!match) {
      console.warn(
        `[Unipile Callback] No unclaimed Unipile account found. ` +
          `Total: ${unipileAccounts.length}, Claimed: ${claimedIds.size}`
      );
      return NextResponse.redirect(
        new URL(
          "/build-in-public?connected=0&reason=no_match",
          request.url
        )
      );
    }

    // Extract LinkedIn internal ID
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
      `[Unipile Callback] Connected: unipile=${match.id}, linkedin=${linkedinId}, name=${match.name}, user=${email}`
    );

    // Trigger initial sync (fire-and-forget)
    syncAccountPosts(match.id).catch((err) =>
      console.error(
        `[Unipile Callback] Initial sync failed for ${match.id}:`,
        err
      )
    );

    return NextResponse.redirect(
      new URL("/build-in-public?connected=1", request.url)
    );
  } catch (err) {
    console.error("[Unipile Callback] Error:", err);
    return NextResponse.redirect(
      new URL("/build-in-public?connected=0&reason=error", request.url)
    );
  }
}
