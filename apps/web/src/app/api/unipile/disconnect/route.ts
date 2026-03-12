import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.unipileLinkedInAccount.updateMany({
    where: { userId: session.user.id, status: "connected" },
    data: { status: "disconnected" },
  });

  return Response.json({ ok: true });
}
