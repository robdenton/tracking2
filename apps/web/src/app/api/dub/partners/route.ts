import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const DUB_API_BASE = "https://api.dub.co";

/**
 * GET /api/dub/partners
 *
 * Fetches all partners from the Dub workspace with metadata and link data.
 * Returns partner name, company, links with shortLink/url/clicks/leads.
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
    const res = await fetch(`${DUB_API_BASE}/partners?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      // If partners endpoint not available (plan limitation), return empty
      if (res.status === 403 || res.status === 404) {
        return NextResponse.json([]);
      }
      return NextResponse.json(
        { error: `Dub Partners API error: ${res.status} ${body}` },
        { status: 502 }
      );
    }

    const partners = await res.json();

    const cleaned = partners.map(
      (p: {
        id: string;
        name: string;
        companyName?: string;
        email?: string;
        country?: string;
        description?: string;
        website?: string;
        totalClicks?: number;
        totalLeads?: number;
        totalConversions?: number;
        totalSales?: number;
        links?: {
          id: string;
          domain: string;
          key: string;
          shortLink: string;
          url: string;
          clicks: number;
          leads: number;
          conversions?: number;
          sales?: number;
        }[];
      }) => ({
        id: p.id,
        name: p.name,
        companyName: p.companyName ?? null,
        email: p.email ?? null,
        country: p.country ?? null,
        description: p.description ?? null,
        website: p.website ?? null,
        totalClicks: p.totalClicks ?? 0,
        totalLeads: p.totalLeads ?? 0,
        totalConversions: p.totalConversions ?? 0,
        totalSales: p.totalSales ?? 0,
        links:
          p.links?.map((l) => ({
            shortLink: l.shortLink,
            url: l.url,
            key: l.key,
            domain: l.domain,
            clicks: l.clicks,
            leads: l.leads,
          })) ?? [],
      })
    );

    return NextResponse.json(cleaned);
  } catch (error) {
    console.error("Error fetching Dub partners:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
