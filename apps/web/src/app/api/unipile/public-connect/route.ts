import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHostedAuthLink } from "@/lib/unipile";

const PASSPHRASE = "Crunched";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { name, passphrase } = body as { name?: string; passphrase?: string };

  if (!passphrase || passphrase.trim().toLowerCase() !== PASSPHRASE.toLowerCase()) {
    return Response.json({ error: "Invalid passphrase" }, { status: 403 });
  }

  if (!name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const expiresOn = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const result = await createHostedAuthLink({
    notify_url: `${baseUrl}/api/webhooks/unipile`,
    success_redirect_url: `${baseUrl}/api/unipile/public-callback?name=${encodeURIComponent(name.trim())}`,
    failure_redirect_url: `${baseUrl}/connect-linkedin?connected=0`,
    name: `granola-team-${name.trim().toLowerCase().replace(/\s+/g, "-")}`,
    expiresOn,
  });

  // Create a pending record (no userId — public flow)
  await prisma.unipileLinkedInAccount.create({
    data: {
      teamMemberName: name.trim(),
      unipileAccountId: `pending-team-${Date.now()}`,
      status: "pending",
    },
  });

  return Response.json({ url: result.url });
}
