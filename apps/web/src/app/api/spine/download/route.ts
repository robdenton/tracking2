import { NextRequest } from "next/server";
import { exportSpine } from "@/lib/tasks/export-spine";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const expected = (process.env.SPINE_ACCESS_TOKEN || "").trim();

  if (!expected) {
    return Response.json({ error: "SPINE_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  if (!token || token !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  // If blob store is configured, try to serve from there
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import("@vercel/blob");
      const dateParam = request.nextUrl.searchParams.get("date");
      const prefix = dateParam
        ? `spine/metrics_spine_${dateParam}.csv`
        : "spine/metrics_spine_latest.csv";

      const { blobs } = await list({ prefix });

      if (blobs.length > 0) {
        const blob = blobs[0];
        return Response.json({
          url: blob.url,
          downloadUrl: blob.downloadUrl,
          pathname: blob.pathname,
          uploadedAt: blob.uploadedAt,
          size: blob.size,
        });
      }
    } catch {
      // Blob store not available, fall through to on-demand generation
    }
  }

  // Fallback: generate spine on-demand and return CSV directly
  const result = await exportSpine();

  return new Response(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="metrics_spine_${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Row-Count": String(result.rowCount),
      "X-Date-Range": `${result.dateRange.from}..${result.dateRange.to}`,
    },
  });
}
