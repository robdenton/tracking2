import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncDubCustomers } from "@/lib/tasks/sync-dub-customers";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  // Support batch parameter: ?batch=0 processes customers 0-499, ?batch=1 processes 500-999, etc.
  const batchParam = request.nextUrl.searchParams.get("batch");
  const batchSize = 500;
  const batch = batchParam != null ? parseInt(batchParam) : undefined;

  try {
    const result = await syncDubCustomers(
      batch != null ? { offset: batch * batchSize, limit: batchSize } : undefined
    );
    return Response.json({ success: true, batch, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync-dub-customers] Failed:", message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
