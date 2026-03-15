import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const dsn = process.env.UNIPILE_DSN?.replace(/\/$/, "") ?? "NOT_SET";
  const apiKey = process.env.UNIPILE_API_KEY ?? "NOT_SET";
  const companyId = process.env.COMPANY_LINKEDIN_ID ?? "NOT_SET";

  const diagnostics: Record<string, unknown> = {
    dsn: dsn.substring(0, 20) + "...",
    apiKeySet: apiKey !== "NOT_SET",
    apiKeyLength: apiKey.length,
    companyId,
    nodeVersion: process.version,
  };

  // Make the actual search call
  const url = `${dsn}/api/v1/linkedin/search?account_id=6keswHDGQ7CRL8WgRlnkjA`;
  const body = JSON.stringify({
    api: "classic",
    category: "posts",
    posted_by: { company: [companyId] },
    sort_by: "date",
  });

  diagnostics.requestUrl = url;
  diagnostics.requestBody = body;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body,
    });

    diagnostics.responseStatus = res.status;
    const responseText = await res.text();

    if (res.ok) {
      const data = JSON.parse(responseText);
      diagnostics.itemCount = data.items?.length ?? 0;
      diagnostics.success = true;
    } else {
      diagnostics.success = false;
      diagnostics.responseBody = responseText.substring(0, 500);
    }
  } catch (err) {
    diagnostics.success = false;
    diagnostics.fetchError = err instanceof Error ? err.message : String(err);
  }

  return Response.json(diagnostics);
}
