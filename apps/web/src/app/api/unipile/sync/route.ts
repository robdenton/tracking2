import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncAccountPosts } from "@/lib/tasks/sync-employee-linkedin";

/** Manual sync trigger — lets user resync their LinkedIn posts on demand */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.unipileLinkedInAccount.findFirst({
    where: { userId: session.user.id, status: "connected" },
  });

  if (!account) {
    return Response.json(
      { error: "No connected LinkedIn account" },
      { status: 400 }
    );
  }

  try {
    const result = await syncAccountPosts(account.unipileAccountId);
    return Response.json({
      ok: true,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
