import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAccounts } from "@/lib/unipile";
import { syncAccountPosts } from "@/lib/tasks/sync-employee-linkedin";

/**
 * Callback route — Unipile redirects here after successful LinkedIn auth.
 *
 * Matching strategy: list all Unipile accounts, filter out ones already linked
 * in our DB, and use the newest unlinked LINKEDIN account.
 * (We cannot match by `name` because Unipile overwrites it with the profile name.)
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

    // Get all Unipile account IDs already linked in our DB
    const linkedRecords = await prisma.unipileLinkedInAccount.findMany({
      where: {
        status: "connected",
        NOT: { unipileAccountId: { startsWith: "pending-" } },
      },
      select: { unipileAccountId: true },
    });
    const linkedIds = new Set(linkedRecords.map((r) => r.unipileAccountId));

    // Find unlinked LINKEDIN accounts — prefer ones not already in our DB
    const unlinked = unipileAccounts.filter(
      (a) => !linkedIds.has(a.id) && (a.provider === "LINKEDIN" || !a.provider)
    );

    console.log(
      `[Unipile Callback] ${unlinked.length} unlinked accounts: ${unlinked.map((a) => `${a.id}(${a.name})`).join(", ")}`
    );

    // Pick the best match:
    // 1. If user had a previous linkedinId, match on that
    // 2. Otherwise, use the most recent unlinked account (last in list)
    let match = unlinked[unlinked.length - 1]; // newest

    if (pendingRecord.linkedinId) {
      const byLinkedInId = unlinked.find(
        (a) => a.connection_params?.im?.id === pendingRecord.linkedinId
      );
      if (byLinkedInId) match = byLinkedInId;
    }

    if (!match) {
      console.warn(
        `[Unipile Callback] No unlinked Unipile account found. ` +
          `Total: ${unipileAccounts.length}, Linked: ${linkedIds.size}`
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
