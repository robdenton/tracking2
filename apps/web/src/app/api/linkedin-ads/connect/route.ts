import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/linkedin-ads";
import { randomBytes } from "crypto";

/**
 * Initiates LinkedIn OAuth flow for Ads API access.
 * Returns the authorization URL — the client-side button redirects the user there.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate CSRF state token
  const state = randomBytes(16).toString("hex");

  // Build redirect URI (same origin as this route)
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/linkedin-ads/callback`;

  const authorizationUrl = getAuthUrl(redirectUri, state);

  // Set state in a short-lived cookie for verification on callback
  const response = NextResponse.json({ url: authorizationUrl });
  response.cookies.set("linkedin_ads_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
