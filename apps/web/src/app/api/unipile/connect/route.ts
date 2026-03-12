import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHostedAuthLink } from "@/lib/unipile";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a connected account
  const existing = await prisma.unipileLinkedInAccount.findFirst({
    where: { userId: session.user.id, status: "connected" },
  });
  if (existing) {
    return Response.json(
      { error: "LinkedIn already connected" },
      { status: 400 }
    );
  }

  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  // Expire link in 15 minutes
  const expiresOn = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const result = await createHostedAuthLink({
    notify_url: `${baseUrl}/api/webhooks/unipile`,
    success_redirect_url: `${baseUrl}/build-in-public?connected=1`,
    failure_redirect_url: `${baseUrl}/build-in-public?connected=0`,
    name: `granola-${session.user.email}`,
    expiresOn,
  });

  // Create a pending account record — will be updated when webhook fires
  await prisma.unipileLinkedInAccount.create({
    data: {
      userId: session.user.id,
      unipileAccountId: `pending-${session.user.id}-${Date.now()}`,
      status: "pending",
    },
  });

  return Response.json({ url: result.url });
}
