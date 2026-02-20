/**
 * LinkedIn Post Categorisation via Claude Haiku
 *
 * Uses the Anthropic API to assign a content category and one-sentence
 * reasoning to each parsed LinkedIn post.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ParsedPost } from "./parse-linkedin-feed";

export interface CategorisedPost extends ParsedPost {
  category: string;
  categoryReasoning: string;
}

const SYSTEM_PROMPT = `You are a marketing content analyst. Your job is to categorise LinkedIn posts by their primary purpose.

Given a LinkedIn post, assign it to ONE of these categories (or create a new concise label if none fit well):
- Social Proof (customer testimonials, reviews, customer quotes, satisfaction scores)
- Customer Announcement (new customer win, milestone, case study, partnership launch)
- Product Launch (new feature, release, update, or product announcement)
- Brand & Storytelling (company culture, values, mission, founder story, team moments)
- Thought Leadership (opinion pieces, industry trends, commentary, insights)
- Event (conference, webinar, meetup, workshop — attending or hosting)
- Hiring (job postings, team growth announcements, culture-for-recruitment)
- Partnership (integration announcement, partner spotlight, ecosystem news)
- Community & Engagement (polls, questions to audience, UGC reposts)

Respond with valid JSON only, no markdown:
{"category": "Category Name", "reasoning": "One sentence explaining why."}`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

async function categoriseOne(
  postText: string
): Promise<{ category: string; reasoning: string }> {
  const anthropic = getClient();
  const truncated = postText.slice(0, 600);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Categorise this LinkedIn post:\n\n${truncated}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return { category: "Uncategorised", reasoning: "No text response from model." };
  }

  try {
    const parsed = JSON.parse(content.text.trim());
    return {
      category: parsed.category ?? "Uncategorised",
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    // If JSON parsing fails, try to extract category from plain text
    const fallbackMatch = content.text.match(/"category"\s*:\s*"([^"]+)"/);
    return {
      category: fallbackMatch ? fallbackMatch[1] : "Uncategorised",
      reasoning: content.text.slice(0, 200),
    };
  }
}

/**
 * Categorises an array of parsed posts using Claude Haiku.
 * Processes in batches of 5 concurrent requests.
 */
export async function categorisePosts(
  posts: ParsedPost[]
): Promise<CategorisedPost[]> {
  const results: CategorisedPost[] = [];
  const batchSize = 5;

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const categorised = await Promise.all(
      batch.map(async (post) => {
        try {
          const { category, reasoning } = await categoriseOne(post.postText);
          return { ...post, category, categoryReasoning: reasoning };
        } catch {
          return {
            ...post,
            category: "Uncategorised",
            categoryReasoning: "Categorisation failed.",
          };
        }
      })
    );
    results.push(...categorised);
  }

  return results;
}
