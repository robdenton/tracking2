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

Granola the product is:
- An AI-powered meeting notetaker / notepad app (https://granola.ai)
- Founded by Christopher (Chris) Pedregal
- Used during work meetings to transcribe, summarize, and take AI-assisted notes
- Commonly compared to: Otter, Fathom, Fireflies, Supernormal, Notion AI, MacWhisper

Granola the food is:
- A breakfast cereal / snack typically made from oats, nuts, honey
- Granola bars, granola yogurt, homemade granola recipes
- "Crunchy granola" style/lifestyle slang

Read the transcript snippets and classify the mention into exactly one of:
- "product": clearly about Granola the AI product (mentions AI/meetings/notes/transcription/Pedregal/competitor tools/SaaS pricing)
- "food": clearly about granola the food (mentions oats/recipes/breakfast/cereal/bars/eating)
- "ambiguous": cannot tell from the snippets — mention is too brief or context is unclear

Respond with valid JSON ONLY in this exact shape (no markdown, no preamble):
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

  const mentions = await prisma.podscanMention.findMany({
    where: {
      snippets: { not: null },
      ...(opts.reclassify ? {} : { llmClassification: null }),
    },
    select: {
      episodeId: true,
      podcastName: true,
      episodeTitle: true,
      summaryShort: true,
      snippets: true,
    },
    take: limit,
  });

  log(`${mentions.length} mentions to classify`);

  let classified = 0;
  let errors = 0;
  const counts = { product: 0, food: 0, ambiguous: 0 };

  for (const m of mentions) {
    const userPrompt = [
      `Podcast: ${m.podcastName ?? "(unknown)"}`,
      `Episode: ${m.episodeTitle ?? "(unknown)"}`,
      m.summaryShort ? `Episode summary: ${m.summaryShort}` : "",
      "",
      "Transcript snippets containing 'granola':",
      m.snippets ?? "",
    ]
      .filter(Boolean)
      .join("\n");

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

      // Parse JSON — tolerate stray whitespace or markdown fencing
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
      const parsed = JSON.parse(jsonMatch[0]) as {
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
