/**
 * Classify X mentions using Claude Haiku.
 *
 * Decides whether each tweet refers to Granola the AI meeting notetaker
 * (https://granola.ai, @meetgranola) or to granola the breakfast food.
 *
 * Re-classifies "ambiguous" rows when re-run so any prompt improvements
 * propagate to previously-uncertain tweets.
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [X Classify] ${msg}`);
}

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You classify whether X (Twitter) posts mentioning "granola" refer to Granola the AI meeting notetaker product, or to granola the breakfast food.

GRANOLA THE PRODUCT:
- An AI-powered meeting notetaker/notepad app (https://granola.ai, @meetgranola)
- Founded by Christopher (Chris) Pedregal and Sam Stephenson
- Used during work meetings to transcribe, summarize, and take AI-assisted notes
- Recently raised $43M and then $125M
- Commonly compared to: Otter, Fathom, Fireflies, Supernormal, Notion AI

GRANOLA THE FOOD:
- Breakfast cereal/snack made from oats, nuts, honey
- Granola bars, granola yogurt, recipes
- "Crunchy granola" lifestyle slang

KEY HEURISTICS:

1. If the tweet mentions @meetgranola, granola.ai, granola.so, Chris Pedregal, Sam Stephenson, or product-context phrases like "AI notetaker", "meeting notes", "notetaking app", "MCP integration" — it's PRODUCT.

2. If the tweet mentions oats, recipes, breakfast, eating, bars, yogurt, cereal, "crunchy granola lifestyle" — it's FOOD.

3. Tweets from VCs, founders, product builders, AI researchers discussing tools, productivity, meetings, or AI in any practical/work context that mentions "granola" are usually PRODUCT.

4. Tweets in food/recipe/wellness/diet/parenting contexts with "granola" are usually FOOD.

5. Use AMBIGUOUS only when the tweet is too short or context-free to tell (e.g. "love granola" with no other signal).

Respond with valid JSON ONLY, no markdown, no preamble:
{"classification":"product"|"food"|"ambiguous","reasoning":"one-sentence justification"}`;

export async function classifyXMentions(opts: {
  limit?: number;
  reclassify?: boolean;
} = {}): Promise<{
  classified: number;
  product: number;
  food: number;
  ambiguous: number;
  errors: number;
}> {
  const limit = opts.limit ?? 1000;
  log(`Starting classification (limit=${limit}, reclassify=${!!opts.reclassify})...`);

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  const where = opts.reclassify
    ? { excluded: false }
    : {
        excluded: false,
        OR: [
          { llmClassification: null },
          { llmClassification: "ambiguous" },
        ],
      };

  const mentions = await prisma.xMention.findMany({
    where,
    select: {
      tweetId: true,
      text: true,
      authorUsername: true,
      authorName: true,
      authorFollowers: true,
      authorVerified: true,
      postedAt: true,
    },
    orderBy: { postedAt: "desc" },
    take: limit,
  });

  log(`${mentions.length} tweets to classify`);

  let classified = 0;
  let errors = 0;
  const counts = { product: 0, food: 0, ambiguous: 0 };

  for (const m of mentions) {
    const userPrompt = [
      `Author: @${m.authorUsername ?? "(unknown)"}${m.authorName ? ` (${m.authorName})` : ""}` +
        (m.authorVerified ? " [verified]" : "") +
        (m.authorFollowers ? ` — ${m.authorFollowers.toLocaleString()} followers` : ""),
      `Posted: ${m.postedAt.toISOString().slice(0, 10)}`,
      "",
      "Tweet:",
      m.text,
    ].join("\n");

    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      // Find the first balanced JSON object (tolerates trailing text)
      const firstBrace = text.indexOf("{");
      if (firstBrace === -1)
        throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
      let depth = 0;
      let end = -1;
      let inStr = false;
      let esc = false;
      for (let i = firstBrace; i < text.length; i++) {
        const c = text[i];
        if (esc) {
          esc = false;
          continue;
        }
        if (c === "\\") {
          esc = true;
          continue;
        }
        if (c === '"') inStr = !inStr;
        if (inStr) continue;
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end === -1)
        throw new Error(`Unbalanced JSON: ${text.slice(0, 200)}`);

      const parsed = JSON.parse(text.slice(firstBrace, end + 1)) as {
        classification: "product" | "food" | "ambiguous";
        reasoning: string;
      };

      if (!["product", "food", "ambiguous"].includes(parsed.classification)) {
        throw new Error(`Invalid classification: ${parsed.classification}`);
      }

      await prisma.xMention.update({
        where: { tweetId: m.tweetId },
        data: {
          llmClassification: parsed.classification,
          llmReasoning: parsed.reasoning,
          llmClassifiedAt: new Date(),
        },
      });

      counts[parsed.classification]++;
      classified++;

      if (classified % 50 === 0) {
        log(
          `  progress: ${classified}/${mentions.length} ` +
            `(product=${counts.product}, food=${counts.food}, ambiguous=${counts.ambiguous})`
        );
      }
    } catch (err) {
      log(`  ! Failed for ${m.tweetId}: ${(err as Error).message}`);
      errors++;
    }
  }

  log(
    `Classification complete: ${classified} classified ` +
      `(product=${counts.product}, food=${counts.food}, ambiguous=${counts.ambiguous}), ${errors} errors`
  );

  return { classified, ...counts, errors };
}
