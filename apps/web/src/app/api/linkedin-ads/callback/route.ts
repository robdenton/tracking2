import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeCode, getAdAccounts } from "@/lib/linkedin-ads";

/**
 * OAuth callback — LinkedIn redirects here after the user grants access.
 * Exchanges the authorization code for tokens, discovers ad accounts,
 * and stores the connection in the database.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    console.warn("[LinkedIn Ads Callback] No session");
    return NextResponse.redirect(
      new URL("/channels/linkedin-ads?error=no_session", request.url)
    );
  }

  const email = session.user.email;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  // Handle user denial
  if (error) {
    console.warn(`[LinkedIn Ads Callback] OAuth error: ${error}`);
    return NextResponse.redirect(
      new URL(
        `/channels/linkedin-ads?error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  if (!code) {
    console.warn("[LinkedIn Ads Callback] No code in callback");
    return NextResponse.redirect(
      new URL("/channels/linkedin-ads?error=no_code", request.url)
    );
  }

  // Verify CSRF state
  const savedState = request.cookies.get("linkedin_ads_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    console.warn("[LinkedIn Ads Callback] State mismatch");
    return NextResponse.redirect(
      new URL("/channels/linkedin-ads?error=state_mismatch", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/linkedin-ads/callback`;

    console.log(`[LinkedIn Ads Callback] Exchanging code for ${email}`);
    const tokens = await exchangeCode(code, redirectUri);

    // Discover ad accounts
    console.log("[LinkedIn Ads Callback] Discovering ad accounts...");
    const adAccounts = await getAdAccounts(tokens.access_token);
    console.log(
      `[LinkedIn Ads Callback] Found ${adAccounts.length} ad accounts: ${adAccounts.map((a) => `${a.name}(${a.id})`).join(", ")}`
    );

    // Pick the first active ad account (most orgs only have one)
    const primaryAccount = adAccounts[0] ?? null;

    // Compute token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert the connection (only one connection at a time)
    const existing = await prisma.linkedInAdsConnection.findFirst();

    if (existing) {
      await prisma.linkedInAdsConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt,
          adAccountId: primaryAccount?.urn ?? null,
          adAccountName: primaryAccount?.name ?? null,
          connectedBy: email,
        },
      });
      console.log(
        `[LinkedIn Ads Callback] Updated existing connection for ${email}`
      );
    } else {
      await prisma.linkedInAdsConnection.create({
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt,
          adAccountId: primaryAccount?.urn ?? null,
          adAccountName: primaryAccount?.name ?? null,
          connectedBy: email,
        },
      });
      console.log(
        `[LinkedIn Ads Callback] Created new connection for ${email}`
      );
    }

    // Clear the state cookie
    const response = NextResponse.redirect(
      new URL("/channels/linkedin-ads?connected=1", request.url)
    );
    response.cookies.delete("linkedin_ads_oauth_state");
    return response;
  } catch (err) {
    console.error("[LinkedIn Ads Callback] Error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(
        `/channels/linkedin-ads?error=${encodeURIComponent(msg)}`,
        request.url
      )
    );
  }
}
