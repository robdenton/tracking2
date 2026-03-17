import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const DUB_API_BASE = "https://api.dub.co";

/**
 * GET /api/dub/links
 *
 * Fetches all links from the Dub workspace with metadata.
 * Returns shortLink, url, key, title, description, comments, tags, clicks, leads.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DUB_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${DUB_API_BASE}/links?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Dub API error: ${res.status} ${body}` },
        { status: 502 }
      );
    }

    const links = await res.json();

    // Return only the fields we need
    const cleaned = links.map(
      (l: {
        shortLink: string;
        url: string;
        key: string;
        domain: string;
        title: string | null;
        description: string | null;
        comments: string | null;
        tags: { id: string; name: string; color: string }[];
        clicks: number;
        leads: number;
      }) => ({
        shortLink: l.shortLink,
        url: l.url,
        key: l.key,
        domain: l.domain,
        title: l.title,
        description: l.description,
        comments: l.comments,
        tags: l.tags?.map((t) => t.name) ?? [],
        clicks: l.clicks,
        leads: l.leads,
      })
    );

    return NextResponse.json(cleaned);
  } catch (error) {
    console.error("Error fetching Dub links:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
