import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

interface DubLinkInput {
  shortLink: string;
  url: string;
  key: string;
  title: string | null;
  description: string | null;
  comments: string | null;
  tags: string[];
  clicks: number;
}

interface DubPartnerInput {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  country: string | null;
  description: string | null;
  website: string | null;
  totalClicks: number;
  totalLeads: number;
  links: {
    shortLink: string;
    url: string;
    key: string;
    clicks: number;
    leads: number;
  }[];
}

interface SuggestedMatch {
  shortLink: string;
  partnerName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  dubPartnerId?: string;
  dubPartnerName?: string;
}

/**
 * POST /api/dub/suggest
 *
 * Uses Claude to suggest which Dub links/partners match which newsletter partners.
 * Body: { links: DubLinkInput[], partners: string[], dubPartners?: DubPartnerInput[] }
 *
 * When dubPartners data is provided, the LLM can use partner names, company info,
 * and their associated links to make much more accurate matches.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { links, partners, dubPartners } = (await req.json()) as {
    links: DubLinkInput[];
    partners: string[];
    dubPartners?: DubPartnerInput[];
  };

  if (!partners?.length) {
    return NextResponse.json(
      { error: "partners array is required" },
      { status: 400 }
    );
  }

  if (!links?.length && !dubPartners?.length) {
    return NextResponse.json(
      { error: "links or dubPartners array is required" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  // Build context about Dub Partners (richer data)
  let dubPartnersSection = "";
  if (dubPartners?.length) {
    const partnerDescriptions = dubPartners
      .map((p) => {
        const linksList = p.links
          .map(
            (l) =>
              `    - ${l.shortLink} → ${l.url || "(no destination)"} (${l.clicks} clicks, ${l.leads} leads)`
          )
          .join("\n");
        return `- Dub Partner: "${p.name}"${p.companyName ? ` (company: ${p.companyName})` : ""}${p.email ? `, email: ${p.email}` : ""}${p.website ? `, website: ${p.website}` : ""}${p.description ? `, description: ${p.description}` : ""}
    Total: ${p.totalClicks} clicks, ${p.totalLeads} leads
    Links:\n${linksList || "    (no links)"}`;
      })
      .join("\n\n");

    dubPartnersSection = `\n## Dub Partners (from partner program — these have rich metadata):\n${partnerDescriptions}\n`;
  }

  // Build context about standalone Dub Links (less rich, but still useful)
  let linksSection = "";
  if (links?.length) {
    const linksDescription = links
      .map(
        (l) =>
          `- ${l.shortLink} → ${l.url || "(no destination)"}\n  key: "${l.key}", title: "${l.title || ""}", comments: "${l.comments || ""}", tags: [${l.tags.join(", ")}], clicks: ${l.clicks}`
      )
      .join("\n");
    linksSection = `\n## Available Dub Links (standalone, not in partner program):\n${linksDescription}\n`;
  }

  const partnersDescription = partners.join(", ");

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are helping match Dub.co short links to newsletter partners for a marketing analytics tool called Granola.

Each newsletter partner (e.g., "TLDR", "Superhuman", "The Coding Sloth") typically has ONE Dub short link that is used as the CTA in their newsletter placements. The Dub link usually points to a Granola landing page (granola.ai or similar).

You have TWO sources of Dub data to work with:

1. **Dub Partners** — these come from Dub's partner program and include partner names, company names, email, website, and their associated links. This is the richest source for matching.

2. **Dub Links** — standalone links with metadata like key names, comments, titles, tags. Less structured but still useful.

Your job: Match each newsletter partner to the correct Dub short link. Use ALL available signals:
- Partner names / company names that match or are similar to newsletter partner names
- Link key names (slug) that reference the partner (e.g., "tldr" in the key for "TLDR" partner)
- URL destination with UTM parameters mentioning the partner
- Comments or tags on the link
- Website domains matching known newsletter brands
- Email domains matching newsletter companies

## Newsletter Partners (need to be matched):
${partnersDescription}
${dubPartnersSection}${linksSection}
Respond with a JSON array of suggested matches. For each match, include:
- "shortLink": the Dub short link URL
- "partnerName": the newsletter partner name (must exactly match one from the list above)
- "confidence": "high" if you're very confident (name match, clear signals), "medium" if likely but not certain, "low" if it's a guess
- "reasoning": brief explanation of why this match makes sense
- "dubPartnerId": (optional) the Dub partner ID if matched from partner data
- "dubPartnerName": (optional) the Dub partner name if different from the newsletter partner name

IMPORTANT:
- Only include matches where you have real signal. Do not guess randomly.
- A "high" confidence match should be nearly certain — clear name match or multiple corroborating signals.
- Each newsletter partner should match to at most ONE link.
- Each link should match to at most ONE partner.

Format: [{"shortLink": "...", "partnerName": "...", "confidence": "high|medium|low", "reasoning": "..."}]

If no matches can be inferred, return an empty array [].
Respond with valid JSON only, no markdown fences.`,
      },
    ],
  });
  } catch (apiErr) {
    const msg = apiErr instanceof Error ? apiErr.message : "Unknown Anthropic API error";
    console.error("Anthropic API error:", msg);
    return NextResponse.json(
      { error: `LLM API call failed: ${msg}` },
      { status: 500 }
    );
  }

  try {
    let text =
      response.content[0].type === "text" ? response.content[0].text : "";
    // Strip markdown code fences if present (e.g. ```json ... ```)
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const suggestions: SuggestedMatch[] = JSON.parse(text);
    return NextResponse.json(suggestions);
  } catch (parseErr) {
    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    console.error("Failed to parse LLM response:", rawText);
    return NextResponse.json(
      { error: "Failed to parse LLM response", raw: rawText.substring(0, 500) },
      { status: 500 }
    );
  }
}
