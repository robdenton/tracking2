/**
 * AI-classify YouTube search results in the review queue.
 *
 * Modes:
 *   validate — runs on historical accepted/rejected videos, compares
 *              classifier decision to the actual human decision, reports
 *              accuracy + confusion matrix + misclassified examples.
 *   pending  — runs on currently-pending search results, writes
 *              proposed decisions to a JSON file for human review.
 *              Does NOT write to DB.
 *
 *   DATABASE_URL=... ANTHROPIC_API_KEY=... node scripts/classify-youtube-reviews.js validate [LIMIT]
 *   DATABASE_URL=... ANTHROPIC_API_KEY=... node scripts/classify-youtube-reviews.js pending
 */

const { PrismaClient } = require("@prisma/client");
const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");

const p = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5";
const MODE = process.argv[2] || "validate";
const LIMIT = parseInt(process.argv[3] || "100", 10);
const CONFIDENCE_THRESHOLD = 0.85;

const SYSTEM_PROMPT = `You are a content curator deciding whether a YouTube video should be added to a tracking dashboard for Granola — the AI meeting notetaker product at granola.ai.

The dashboard tracks ANY video that discusses, demos, mentions, or is about Granola the AI product — even briefly. Be permissive on accepts; humans want to track broad organic coverage.

ACCEPT a video when ANY of these is true:
- Title explicitly names "Granola AI", "Granola app", "Granola ai", or similar
- Title describes "AI notetaker", "AI meeting notes", "AI notepad", "transcribe meetings" etc. AND channel is tech/business/AI/productivity-focused
- Description mentions granola.ai, @meetgranola, Granola app, Chris Pedregal, or Sam Stephenson
- Description mentions Granola in AI/notetaker/productivity context
- Has an affiliate/tracked link to granola.ai/.so/.io (granolaLinkInDesc=true)
- Has sponsored disclosure for a tech/AI/productivity tool
- Shorts (<60s) are FINE if title clearly names Granola in product/AI context — they're valid quick demos and tutorials
- Tutorials, alternatives-to, comparisons, listicles that mention Granola are FINE
- Sponsor reads on tech podcasts/channels even if Granola isn't the main topic — these count
- If granolaLinkInDesc=true (description contains a granola.ai/.so/.io link), strongly lean ACCEPT — this is direct evidence the creator is promoting or affiliated with Granola, even if the video title is about something else (e.g. podcast sponsor reads)
- Non-English videos (Spanish, Italian, German, Japanese, Chinese, Portuguese, etc.) that clearly discuss Granola the product → ACCEPT. The dashboard tracks Granola coverage across all languages.

REJECT a video when ANY of these is true:
- Topic is clearly granola the food (cereal, bars, oats, breakfast, recipes, yogurt, "crunchy granola lifestyle", parfait, healthy snack)
- Topic is "Granolah" — the Dragon Ball Super anime character
- "Granola" is a pet name, baby name, person name, character name (e.g. dance moves, song lyrics)
- Channel is food / cooking / fitness influencer / parenting / anime / general lifestyle vlog AND no product context in description
- Music/song with no AI-product link
- Title clearly indicates a different topic AND description has no Granola product references AND no granolaLinkInDesc signal

WHEN UNCLEAR:
- If title or description has clear Granola-as-product signal, lean ACCEPT
- If title is generic ("Productivity apps I use", "AI tools roundup") and no explicit Granola mention anywhere, lean REJECT (the search might have surfaced a false match)
- For channels you don't recognise but title is clearly about Granola product, ACCEPT

CONFIDENCE:
- 0.95+: unambiguous on either direction
- 0.85-0.94: clear leaning with one weak counter-signal
- 0.70-0.84: leaning but with real ambiguity
- <0.70: too uncertain

Respond with valid JSON ONLY, no markdown:
{"decision":"accept"|"reject","confidence":0.0-1.0,"reasoning":"one-sentence justification"}`;

function buildUserPrompt(v) {
  const parts = [
    `Title: ${v.title}`,
    `Channel: ${v.channelTitle}`,
    `Published: ${v.publishedAt}`,
  ];
  if (v.durationSeconds)
    parts.push(`Duration: ${Math.round(v.durationSeconds / 60)} min`);
  if (v.likeCount) parts.push(`Likes: ${v.likeCount.toLocaleString()}`);
  if (v.granolaLinkInDesc) parts.push(`Has Granola link in description: yes`);
  if (v.sponsoredDisclosure) parts.push(`Has sponsored disclosure: yes`);
  parts.push("");
  parts.push("Description:");
  parts.push((v.description || "(no description)").slice(0, 1500));
  return parts.join("\n");
}

async function classify(v) {
  const userPrompt = buildUserPrompt(v);
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 250,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) throw new Error("No JSON: " + text.slice(0, 200));
  let depth = 0,
    end = -1,
    inStr = false,
    esc = false;
  for (let i = firstBrace; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error("Unbalanced JSON: " + text.slice(0, 200));
  const parsed = JSON.parse(text.slice(firstBrace, end + 1));
  if (!["accept", "reject"].includes(parsed.decision))
    throw new Error("Invalid decision: " + parsed.decision);
  return parsed;
}

async function enrichWithImportedMeta(searchResults) {
  const videoIds = searchResults.map((s) => s.videoId);
  const imported = await p.importedYouTubeVideo.findMany({
    where: { videoId: { in: videoIds } },
    select: {
      videoId: true,
      durationSeconds: true,
      likeCount: true,
      granolaLinkInDesc: true,
      sponsoredDisclosure: true,
      description: true,
    },
  });
  const byVid = new Map(imported.map((i) => [i.videoId, i]));
  return searchResults.map((s) => ({
    sr_id: s.id,
    video_id: s.videoId,
    title: s.title,
    channelTitle: s.channelTitle,
    publishedAt: s.publishedAt,
    description: byVid.get(s.videoId)?.description || s.description,
    status: s.status,
    durationSeconds: byVid.get(s.videoId)?.durationSeconds,
    likeCount: byVid.get(s.videoId)?.likeCount,
    granolaLinkInDesc: byVid.get(s.videoId)?.granolaLinkInDesc,
    sponsoredDisclosure: byVid.get(s.videoId)?.sponsoredDisclosure,
  }));
}

async function runValidate() {
  // Pull stratified sample: half from accepted, half from rejected
  const half = Math.floor(LIMIT / 2);
  const [acceptedRaw, rejectedRaw] = await Promise.all([
    p.youTubeSearchResult.findMany({ where: { status: "accepted" }, take: 5000 }),
    p.youTubeSearchResult.findMany({ where: { status: "rejected" }, take: 5000 }),
  ]);
  // Random sample in-memory
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  const accepted = shuffle([...acceptedRaw]).slice(0, half);
  const rejected = shuffle([...rejectedRaw]).slice(0, half);
  const sample = await enrichWithImportedMeta([...accepted, ...rejected]);
  console.log(`Validating against ${sample.length} historical decisions (${accepted.length} accepted, ${rejected.length} rejected)`);

  const results = [];
  let processed = 0;
  for (const v of sample) {
    try {
      const ai = await classify(v);
      // DB stores "accepted"/"rejected"; AI returns "accept"/"reject"
      const humanShort = v.status === "accepted" ? "accept" : "reject";
      const correct = ai.decision === humanShort;
      results.push({ ...v, ai_decision: ai.decision, ai_confidence: ai.confidence, ai_reasoning: ai.reasoning, correct });
      processed++;
      if (processed % 25 === 0) {
        const acc = results.filter((r) => r.correct).length / results.length;
        console.log(`  ${processed}/${sample.length} | accuracy so far: ${(acc * 100).toFixed(1)}%`);
      }
    } catch (e) {
      console.log("  ! err on", v.video_id, e.message.slice(0, 80));
    }
  }

  // Confusion matrix
  const cm = { tp: 0, tn: 0, fp: 0, fn: 0 };
  for (const r of results) {
    if (r.status === "accepted" && r.ai_decision === "accept") cm.tp++;
    else if (r.status === "rejected" && r.ai_decision === "reject") cm.tn++;
    else if (r.status === "rejected" && r.ai_decision === "accept") cm.fp++;
    else if (r.status === "accepted" && r.ai_decision === "reject") cm.fn++;
  }
  const total = cm.tp + cm.tn + cm.fp + cm.fn;
  const accuracy = (cm.tp + cm.tn) / total;
  const precision = cm.tp / (cm.tp + cm.fp || 1);
  const recall = cm.tp / (cm.tp + cm.fn || 1);

  console.log();
  console.log("=== Validation results ===");
  console.log(`  Sample size: ${total}`);
  console.log(`  Accuracy: ${(accuracy * 100).toFixed(1)}%`);
  console.log(`  Precision: ${(precision * 100).toFixed(1)}% (when AI says accept, this % were actually accepted)`);
  console.log(`  Recall:    ${(recall * 100).toFixed(1)}% (of actually-accepted, this % were caught by AI)`);
  console.log();
  console.log("  Confusion matrix:");
  console.log("              AI accept | AI reject");
  console.log(`  human accept:  ${String(cm.tp).padStart(4)}    |  ${String(cm.fn).padStart(4)} (false negatives — AI would have wrongly rejected)`);
  console.log(`  human reject:  ${String(cm.fp).padStart(4)}    |  ${String(cm.tn).padStart(4)} (false positives — AI would have wrongly accepted)`);

  // Confidence-bucketed accuracy
  console.log();
  console.log("  Accuracy by confidence bucket:");
  for (const [label, min, max] of [
    ["high (>=0.85)", 0.85, 1.01],
    ["med  (0.70-0.84)", 0.7, 0.85],
    ["low  (<0.70)", 0, 0.7],
  ]) {
    const bucket = results.filter((r) => r.ai_confidence >= min && r.ai_confidence < max);
    if (bucket.length === 0) { console.log(`    ${label}: 0 items`); continue; }
    const acc = bucket.filter((r) => r.correct).length / bucket.length;
    console.log(`    ${label}: ${bucket.length} items | accuracy ${(acc * 100).toFixed(1)}%`);
  }

  // Misclassifications
  const misclass = results.filter((r) => !r.correct);
  console.log();
  console.log(`  ${misclass.length} misclassifications:`);
  for (const r of misclass.slice(0, 20)) {
    console.log(`    [${r.status} → ${r.ai_decision}, conf ${r.ai_confidence.toFixed(2)}] ${r.title.slice(0, 70)}`);
    console.log(`      reasoning: ${r.ai_reasoning}`);
  }
  if (misclass.length > 20) console.log(`    ... and ${misclass.length - 20} more`);

  fs.writeFileSync("/tmp/youtube-validation.json", JSON.stringify(results, null, 2));
  console.log();
  console.log("  Full results saved: /tmp/youtube-validation.json");

  await p.$disconnect();
}

async function runPending() {
  const pendingRaw = await p.youTubeSearchResult.findMany({
    where: { status: "pending" },
    orderBy: { publishedAt: "desc" },
  });
  const pending = await enrichWithImportedMeta(pendingRaw);
  console.log(`Classifying ${pending.length} pending videos...`);

  const decisions = { accept: 0, reject: 0, defer: 0 };
  const out = [];
  let processed = 0;
  for (const v of pending) {
    try {
      const ai = await classify(v);
      const autoDecided = ai.confidence >= CONFIDENCE_THRESHOLD;
      const bucket = autoDecided ? ai.decision : "defer";
      decisions[bucket]++;
      out.push({
        sr_id: v.sr_id,
        video_id: v.video_id,
        title: v.title,
        channel: v.channelTitle,
        ai_decision: ai.decision,
        ai_confidence: ai.confidence,
        auto_decided: autoDecided,
        ai_reasoning: ai.reasoning,
        url: `https://youtube.com/watch?v=${v.video_id}`,
      });
      processed++;
      if (processed % 25 === 0)
        console.log(`  ${processed}/${pending.length} | accept=${decisions.accept} reject=${decisions.reject} defer=${decisions.defer}`);
    } catch (e) {
      console.log("  ! err on", v.video_id, e.message.slice(0, 80));
    }
  }

  console.log();
  console.log(`Done: accept=${decisions.accept} reject=${decisions.reject} defer-to-human=${decisions.defer}`);

  fs.writeFileSync("/tmp/youtube-pending-decisions.json", JSON.stringify(out, null, 2));
  console.log("Full decisions saved: /tmp/youtube-pending-decisions.json");

  // Show a sample of low-confidence ones for inspection
  const deferred = out.filter((o) => !o.auto_decided);
  if (deferred.length > 0) {
    console.log();
    console.log(`Sample of ${Math.min(10, deferred.length)} deferred (low-confidence) videos:`);
    for (const o of deferred.slice(0, 10)) {
      console.log(`  conf=${o.ai_confidence.toFixed(2)} would=${o.ai_decision} | ${o.title.slice(0, 70)}`);
      console.log(`    ↳ ${o.ai_reasoning}`);
    }
  }

  await p.$disconnect();
}

(async () => {
  if (MODE === "validate") await runValidate();
  else if (MODE === "pending") await runPending();
  else {
    console.error("Mode must be 'validate' or 'pending'");
    process.exit(1);
  }
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
