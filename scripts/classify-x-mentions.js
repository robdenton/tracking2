/**
 * One-off X-mention classifier — uses Claude Haiku to label each tweet as
 * "product" / "food" / "ambiguous" based on tweet text + author context.
 *
 *   DATABASE_URL=... ANTHROPIC_API_KEY=... node scripts/classify-x-mentions.js
 */

const { PrismaClient } = require("@prisma/client");
const Anthropic = require("@anthropic-ai/sdk").default;

const p = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

async function classify(m) {
  const userPrompt = [
    `Author: @${m.authorUsername || "(unknown)"}${m.authorName ? ` (${m.authorName})` : ""}` +
      (m.authorVerified ? " [verified]" : "") +
      (m.authorFollowers
        ? ` — ${m.authorFollowers.toLocaleString()} followers`
        : ""),
    `Posted: ${m.postedAt.toISOString().slice(0, 10)}`,
    "",
    "Tweet:",
    m.text,
  ].join("\n");

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

  // Find balanced JSON object
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) throw new Error("No JSON: " + text.slice(0, 200));
  let depth = 0,
    end = -1,
    inStr = false,
    esc = false;
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
  const mentions = await p.xMention.findMany({
    where: {
      excluded: false,
      OR: [
        { llmClassification: null },
        { llmClassification: "ambiguous" },
      ],
    },
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
  });

  console.log(`Classifying ${mentions.length} tweets...`);

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
      await p.xMention.update({
        where: { tweetId: m.tweetId },
        data: {
          llmClassification: result.classification,
          llmReasoning: result.reasoning,
          llmClassifiedAt: new Date(),
        },
      });
      counts[result.classification]++;
      ok++;
      if (ok % 50 === 0) {
        console.log(
          `  ${ok}/${mentions.length} | product=${counts.product} food=${counts.food} ambiguous=${counts.ambiguous}`,
        );
      }
    } catch (e) {
      console.log("  ! err on", m.tweetId, e.message.slice(0, 80));
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
       COALESCE(SUM(impression_count) FILTER (WHERE llm_classification='product'), 0)::bigint as product_impressions,
       COUNT(*)::int as total
     FROM x_mentions WHERE excluded=false`,
  );
  console.log(
    "Final:",
    JSON.stringify(final, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
