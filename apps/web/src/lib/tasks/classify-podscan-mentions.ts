/**
 * Classify Podscan mentions using Claude.
 *
 * Reads transcript snippets around each "granola" occurrence and decides
 * whether the mention refers to Granola the AI notetaking product, granola
 * the food, or is ambiguous. Stores the classification + reasoning on the
 * `PodscanMention` row.
 *
 * Only classifies mentions with non-null snippets and null llmClassification
 * (so re-runs are incremental and cheap).
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [Podscan Classify] ${msg}`);
}

const MODEL = "claude-haiku-4-5"; // cheap + fast; binary classification is well within Haiku's range

const SYSTEM_PROMPT = `You classify whether podcast mentions of "granola" refer to Granola the AI meeting notetaker product, or to granola the breakfast food.

GRANOLA THE PRODUCT:
- An AI-powered meeting notetaker/notepad app (https://granola.ai, also known as granola.so)
- Founded by Christopher (Chris) Pedregal
- Used during work meetings to transcribe, summarize, and take AI-assisted notes
- Commonly compared to: Otter, Fathom, Fireflies, Supernormal, Notion AI

GRANOLA THE FOOD:
- Breakfast cereal/snack made from oats, nuts, honey
- Granola bars, granola yogurt, recipes
- "Crunchy granola" lifestyle slang

KEY HEURISTICS:

1. Look at which SEARCH QUERY matched this episode. If it matched on:
   - "granola.ai", "granola.so" — the literal product domain → PRODUCT (granola-the-food doesn't use these URLs)
   - "chris pedregal", "granola" AND "pedregal" — co-occurrence with the founder's name → PRODUCT
   - "granola" AND "notetaker" / "notetaking" / "notepad" / "AI notes" — product-specific terminology → PRODUCT
   These matches alone are strong evidence of product. Default to "product" unless there's clear food context.

2. If the summary mentions "sponsor read", "sponsored by Granola", or lists Granola alongside other brand sponsors (e.g. "Lowe's, Hers, and Granola"), that's PRODUCT. Granola-the-food doesn't sponsor podcasts under brand "Granola" — that's the AI company.

3. If the summary describes a tech/AI/productivity/business/meetings/notetaking podcast and mentions Granola → PRODUCT.

4. Only classify as FOOD if there's CLEAR food context (oats, recipes, breakfast, eating, bars, yogurt, granola bowls, etc.).

5. Only use AMBIGUOUS when even the matched query is broad (e.g. "granola for", "using granola") AND the summary gives no context either way.

Respond with valid JSON ONLY, no markdown, no preamble, in this exact shape:
{"classification":"product"|"food"|"ambiguous","reasoning":"one-sentence justification"}`;

export interface ClassifierOpts {
  limit?: number; // max mentions to classify in this run
  reclassify?: boolean; // re-classify rows that already have a classification
}

export async function classifyPodscanMentions(opts: ClassifierOpts = {}): Promise<{
  classified: number;
  product: number;
  food: number;
  ambiguous: number;
  errors: number;
}> {
  const limit = opts.limit ?? 2000;
  log(`Starting classification (limit=${limit}, reclassify=${!!opts.reclassify})...`);

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  // Classify any mention that has at least one signal (snippets or summary).
  // Re-classify ambiguous rows that now have snippets — when the next sync
  // populates a transcript, the additional context usually resolves the
  // earlier "I can't tell" verdict. Costs an extra classify call per row but
  // only as long as the row stays ambiguous.
  const where = opts.reclassify
    ? {
        OR: [{ snippets: { not: null } }, { summaryShort: { not: null } }],
      }
    : {
        OR: [
          {
            llmClassification: null,
            OR: [
              { snippets: { not: null } },
              { summaryShort: { not: null } },
            ],
          },
          {
            llmClassification: "ambiguous",
            snippets: { not: null },
          },
        ],
      };

  const mentions = await prisma.podscanMention.findMany({
    where,
    select: {
      episodeId: true,
      podcastName: true,
      episodeTitle: true,
      summaryShort: true,
      summaryLong: true,
      snippets: true,
      matchedQueries: true,
    },
    take: limit,
  });

  log(`${mentions.length} mentions to classify`);

  let classified = 0;
  let errors = 0;
  const counts = { product: 0, food: 0, ambiguous: 0 };

  for (const m of mentions) {
    const promptParts = [
      `Matched search queries: ${(m as { matchedQueries?: string | null }).matchedQueries ?? "(unknown)"}`,
      `Podcast: ${m.podcastName ?? "(unknown)"}`,
      `Episode: ${m.episodeTitle ?? "(unknown)"}`,
    ];
    if (m.summaryShort) promptParts.push(`Episode summary: ${m.summaryShort}`);
    if (m.snippets) {
      promptParts.push("", "Transcript snippets containing 'granola':", m.snippets);
    } else if (m.summaryLong) {
      promptParts.push("", "Longer summary:", m.summaryLong.slice(0, 2000));
    }
    const userPrompt = promptParts.join("\n");

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

      await prisma.podscanMention.update({
        where: { episodeId: m.episodeId },
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
      log(`  ! Failed for ${m.episodeId}: ${(err as Error).message}`);
      errors++;
    }
  }

  log(
    `Classification complete: ${classified} classified ` +
      `(product=${counts.product}, food=${counts.food}, ambiguous=${counts.ambiguous}), ${errors} errors`
  );

  return { classified, ...counts, errors };
}
