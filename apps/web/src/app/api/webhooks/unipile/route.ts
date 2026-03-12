import { prisma } from "@/lib/prisma";
import { syncAccountPosts } from "@/lib/tasks/sync-employee-linkedin";

export async function POST(request: Request) {
  const body = await request.json();
  const { event, account_id, name } = body;

  console.log(
    `[Unipile Webhook] event=${event} account_id=${account_id} name=${name}`
  );

  if (event === "account.connected" && account_id) {
    // The `name` field contains "granola-{email}" set during hosted auth
    const email = typeof name === "string" ? name.replace("granola-", "") : null;

    let accountRecord = null;

    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        accountRecord = await prisma.unipileLinkedInAccount.findFirst({
          where: { userId: user.id, status: "pending" },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    if (accountRecord) {
      await prisma.unipileLinkedInAccount.update({
        where: { id: accountRecord.id },
        data: {
          unipileAccountId: account_id,
          status: "connected",
          connectedAt: new Date(),
        },
      });

      console.log(
        `[Unipile Webhook] Account ${account_id} connected for ${email}`
      );

      // Trigger initial sync (fire-and-forget)
      syncAccountPosts(account_id).catch((err) =>
        console.error(
          `[Unipile Webhook] Initial sync failed for ${account_id}:`,
          err
        )
      );
    } else {
      console.warn(
        `[Unipile Webhook] No pending account found for name=${name}`
      );
    }
  }

  if (event === "account.disconnected" && account_id) {
    await prisma.unipileLinkedInAccount.updateMany({
      where: { unipileAccountId: account_id },
      data: { status: "disconnected" },
    });
    console.log(`[Unipile Webhook] Account ${account_id} disconnected`);
  }

  return Response.json({ ok: true });
}
