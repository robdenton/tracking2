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

interface SuggestedMatch {
  shortLink: string;
  partnerName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

/**
 * POST /api/dub/suggest
 *
 * Uses Claude to suggest which Dub links match which newsletter partners.
 * Body: { links: DubLinkInput[], partners: string[] }
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

  const { links, partners } = (await req.json()) as {
    links: DubLinkInput[];
    partners: string[];
  };

  if (!links?.length || !partners?.length) {
    return NextResponse.json(
      { error: "links and partners arrays are required" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const linksDescription = links
    .map(
      (l) =>
        `- ${l.shortLink} → ${l.url || "(no destination)"}\n  key: "${l.key}", title: "${l.title || ""}", comments: "${l.comments || ""}", tags: [${l.tags.join(", ")}], clicks: ${l.clicks}`
    )
    .join("\n");

  const partnersDescription = partners.join(", ");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are helping match Dub.co short links to newsletter partners for a marketing analytics tool.

Each newsletter partner (e.g., "TLDR", "Superhuman", "The Coding Sloth") typically has ONE Dub short link that is used as the CTA in their newsletter placements. The Dub link usually points to a Granola landing page (granola.ai).

Based on the link metadata (key name, comments, title, tags, destination URL), suggest which links might belong to which newsletter partners.

## Newsletter Partners (unmatched):
${partnersDescription}

## Available Dub Links:
${linksDescription}

Respond with a JSON array of suggested matches. Only include matches where you have at least some signal (from the key name, comments, UTM parameters, or tags). Do not guess randomly.

Format:
[{"shortLink": "https://go.granola.ai/...", "partnerName": "Partner Name", "confidence": "high|medium|low", "reasoning": "Why this match makes sense"}]

If no matches can be inferred, return an empty array [].
Respond with valid JSON only, no markdown fences.`,
      },
    ],
  });

  try {
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const suggestions: SuggestedMatch[] = JSON.parse(text);
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse LLM response", raw: response.content },
      { status: 500 }
    );
  }
}
