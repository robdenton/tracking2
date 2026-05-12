/**
 * One-off classifier — uses Claude to label each Podscan mention as
 * "product" / "food" / "ambiguous" based on title + summary + (if available)
 * transcript snippets.
 *
 * Run via:
 *   DATABASE_URL=... ANTHROPIC_API_KEY=... node scripts/classify-podscan.js
 */

const { PrismaClient } = require("@prisma/client");
const Anthropic = require("@anthropic-ai/sdk").default;

const p = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5";

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

Read the context and classify the mention into exactly one of:
- "product": clearly about Granola the AI product (mentions AI/meetings/notes/transcription/Pedregal/competitor tools/SaaS pricing)
- "food": clearly about granola the food (mentions oats/recipes/breakfast/cereal/bars/eating)
- "ambiguous": cannot tell — context is unclear or too brief

Respond with valid JSON ONLY in this exact shape (no markdown, no preamble):
{"classification":"product"|"food"|"ambiguous","reasoning":"one-sentence justification"}`;

async function classify(m) {
  const parts = [
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

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

(async () => {
  const mentions = await p.podscanMention.findMany({
    where: {
      OR: [{ snippets: { not: null } }, { summaryShort: { not: null } }],
      llmClassification: null,
      excluded: false,
    },
    select: {
      episodeId: true,
      podcastName: true,
      episodeTitle: true,
      summaryShort: true,
      summaryLong: true,
      snippets: true,
    },
  });

  console.log(`Classifying ${mentions.length} mentions...`);

  let ok = 0,
    err = 0;
  const counts = { product: 0, food: 0, ambiguous: 0 };

  for (let i = 0; i < mentions.length; i++) {
    const m = mentions[i];
    try {
      const result = await classify(m);
      if (!["product", "food", "ambiguous"].includes(result.classification)) {
        throw new Error("Invalid classification: " + result.classification);
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
      console.log("  ! err on", m.episodeId, e.message);
      err++;
    }
  }

  console.log();
  console.log(
    `Done: ok=${ok} err=${err} | product=${counts.product} food=${counts.food} ambiguous=${counts.ambiguous}`,
  );

  const summary = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*) FILTER (WHERE llm_classification='product') as product,
       COUNT(*) FILTER (WHERE llm_classification='food') as food,
       COUNT(*) FILTER (WHERE llm_classification='ambiguous') as ambiguous,
       COUNT(*) FILTER (WHERE llm_classification IS NULL) as unclassified,
       COUNT(*)::int as total
     FROM podscan_mentions WHERE excluded=false`,
  );
  console.log(
    "Final:",
    JSON.stringify(summary, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
