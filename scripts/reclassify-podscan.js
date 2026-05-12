/**
 * Re-run classifier with an improved prompt that:
 *   - Tells the LLM which query patterns matched (high-precision evidence)
 *   - Recognizes sponsor reads as proof of product (food doesn't sponsor pods)
 *   - Defaults to "product" for matches on granola.ai / chris pedregal /
 *     granola+pedregal / granola+notetaker / granola+notepad — these queries
 *     are by design only triggered by the product
 *
 * Re-classifies all rows marked "ambiguous" plus those previously skipped.
 */

const { PrismaClient } = require("@prisma/client");
const Anthropic = require("@anthropic-ai/sdk").default;

const p = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5";

// Queries that, if matched, are essentially proof of product mention
const HIGH_PRECISION_QUERIES = new Set([
  '"granola.ai"',
  '"granola.so"',
  '"chris pedregal"',
  '"granola" AND "pedregal"',
  '"granola" AND "notetaker"',
  '"granola" AND "notetaking"',
  '"granola" AND "notepad"',
  '"granola" AND "AI notes"',
]);

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

async function classify(m) {
  const parts = [
    `Matched search queries: ${m.matchedQueries ?? "(unknown)"}`,
    `Podcast: ${m.podcastName ?? "(unknown)"}`,
    `Episode: ${m.episodeTitle ?? "(unknown)"}`,
  ];
  if (m.summaryShort) parts.push(`Episode summary: ${m.summaryShort}`);
  if (m.snippets) {
    parts.push("", "Transcript snippets containing 'granola':", m.snippets);
  } else if (m.summaryLong) {
    parts.push("", "Longer summary:", m.summaryLong.slice(0, 2000));
  }
  const userPrompt = parts.join("\n");

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Tolerate trailing text by finding the FIRST balanced JSON object
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) throw new Error("No JSON: " + text.slice(0, 200));
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
  if (end === -1) throw new Error("Unbalanced JSON: " + text.slice(0, 200));
  return JSON.parse(text.slice(firstBrace, end + 1));
}

(async () => {
  // Re-classify all rows previously marked ambiguous, AND the unclassified
  // ones with summaries (in case the new prompt picks them up)
  const mentions = await p.podscanMention.findMany({
    where: {
      OR: [
        { llmClassification: "ambiguous" },
        {
          llmClassification: null,
          OR: [{ snippets: { not: null } }, { summaryShort: { not: null } }],
        },
      ],
      excluded: false,
    },
    select: {
      episodeId: true,
      podcastName: true,
      episodeTitle: true,
      summaryShort: true,
      summaryLong: true,
      snippets: true,
      matchedQueries: true,
    },
  });

  console.log(`Re-classifying ${mentions.length} mentions with improved prompt...`);

  let ok = 0,
    err = 0;
  const counts = { product: 0, food: 0, ambiguous: 0 };

  for (let i = 0; i < mentions.length; i++) {
    const m = mentions[i];
    try {
      const result = await classify(m);
      if (!["product", "food", "ambiguous"].includes(result.classification)) {
        throw new Error("Invalid: " + result.classification);
      }
      await p.podscanMention.update({
        where: { episodeId: m.episodeId },
        data: {
          llmClassification: result.classification,
          llmReasoning: result.reasoning,
          llmClassifiedAt: new Date(),
        },
      });
      counts[result.classification]++;
      ok++;
      if (ok % 25 === 0) {
        console.log(
          `  ${ok}/${mentions.length} | product=${counts.product} food=${counts.food} ambiguous=${counts.ambiguous}`,
        );
      }
    } catch (e) {
      console.log("  ! err on", m.episodeId, e.message.slice(0, 100));
      err++;
    }
  }

  console.log();
  console.log(
    `Done: ok=${ok} err=${err} | product=${counts.product} food=${counts.food} ambiguous=${counts.ambiguous}`,
  );

  const final = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*) FILTER (WHERE llm_classification='product') as product,
       COUNT(*) FILTER (WHERE llm_classification='food') as food,
       COUNT(*) FILTER (WHERE llm_classification='ambiguous') as ambiguous,
       COUNT(*) FILTER (WHERE llm_classification IS NULL) as unclassified,
       COUNT(*) FILTER (WHERE llm_classification='product' AND is_sponsored IS NOT TRUE) as organic_product,
       COUNT(*)::int as total
     FROM podscan_mentions WHERE excluded=false`,
  );
  console.log(
    "Final DB:",
    JSON.stringify(final, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
