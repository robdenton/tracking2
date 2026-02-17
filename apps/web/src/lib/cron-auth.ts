import { NextRequest } from "next/server";

/**
 * Verify that the request includes a valid CRON_SECRET.
 * Vercel Cron Jobs automatically include this header.
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    console.warn("[Cron Auth] Missing authorization header");
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[Cron Auth] CRON_SECRET not configured in environment");
    return false;
  }

  const isValid = token === expectedSecret;

  if (!isValid) {
    console.warn("[Cron Auth] Invalid cron secret provided");
  }

  return isValid;
}

/**
 * Standard unauthorized response for cron endpoints.
 */
export function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 });
}
