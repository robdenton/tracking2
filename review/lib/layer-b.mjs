// Layer B — semantic implicature pass, plus Layer A adjudication.
//
// Two SEPARATE model calls per article, deliberately:
//
//   1. semanticPass()  — reads every sentence against the governing test with
//      NO knowledge of what Layer A matched. This independence is the whole
//      point: a Layer B that only filtered Layer A's hits would inherit the
//      lexicon's blind spots, which is the exact failure this review exists to
//      prevent.
//
//   2. adjudicateLexicon() — takes Layer A's literal hits and assigns each one
//      a disposition. Nothing is silently cleared: every hit comes back with a
//      disposition and a reason, including the cleared ones.
//
// RULES.md is read FRESH FROM DISK on every call (see callers) and sent as the
// system prompt, so the standard cannot drift across 207 iterations.

import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5';

// Lazy — ES module imports are hoisted above the caller's env loading, so
// constructing the client at module scope would read the key before .env is
// applied.
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const DISPOSITIONS = [
  'red', 'amber', 'cleared-negated', 'cleared-in-context', 'about-competitor', 'not-audited',
];

// ---- shared schema pieces -------------------------------------------------
const FINDING_PROPS = {
  segment_id: { type: 'string', description: 'The exact segment id (e.g. "s12") the quote comes from.' },
  quote: {
    type: 'string',
    description:
      'The flagged text, copied VERBATIM and EXACTLY as it appears in that segment — character for character, no paraphrase, no ellipsis, no added or removed punctuation. It must be findable with an exact substring search of the segment text.',
  },
  disposition: { type: 'string', enum: DISPOSITIONS },
  reader_takeaway: {
    type: 'string',
    description: 'One sentence: what a reader would take from this, in terms of the governing test.',
  },
  suggested_rewrite: {
    type: 'string',
    description: 'A concrete proposed rewrite of the quoted text. For cleared items, may be an empty string.',
  },
  confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
};

const SEMANTIC_TOOL = {
  name: 'report_findings',
  description: 'Report every sentence that fails the governing test.',
  input_schema: {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        description: 'All failing sentences, in document order. Empty array if none.',
        items: {
          type: 'object',
          properties: FINDING_PROPS,
          required: ['segment_id', 'quote', 'disposition', 'reader_takeaway', 'suggested_rewrite', 'confidence'],
        },
      },
    },
    required: ['findings'],
  },
};

const ADJUDICATE_TOOL = {
  name: 'report_dispositions',
  description: 'Assign a disposition to every lexicon hit provided. Return one entry per hit, same order.',
  input_schema: {
    type: 'object',
    properties: {
      dispositions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            hit_index: { type: 'integer', description: 'The index number of the hit being dispositioned.' },
            disposition: { type: 'string', enum: DISPOSITIONS },
            reader_takeaway: { type: 'string' },
            suggested_rewrite: { type: 'string' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['hit_index', 'disposition', 'reader_takeaway', 'suggested_rewrite', 'confidence'],
        },
      },
    },
    required: ['dispositions'],
  },
};

// ---- API call with retry --------------------------------------------------
async function callTool({ system, user, tool, maxTokens = 16000 }) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await getClient().messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: user }],
      });
      if (resp.stop_reason === 'refusal') throw new Error('model refusal');
      const block = resp.content.find((b) => b.type === 'tool_use');
      if (!block) throw new Error(`no tool_use block (stop_reason=${resp.stop_reason})`);
      return { input: block.input, usage: resp.usage, stop_reason: resp.stop_reason };
    } catch (e) {
      lastErr = e;
      const status = e?.status;
      // Retry transient failures only.
      if (status && ![408, 409, 429, 500, 502, 503, 529].includes(status)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

function renderSegments(segments) {
  return segments.map((s) => `[${s.id}] (${s.label})\n${s.text}`).join('\n\n');
}

// ---- 1. Semantic pass (independent of Layer A) ----------------------------
export async function semanticPass({ rulesText, post, segments }) {
  const system = `${rulesText}

---
You are performing the **Layer B — semantic implicature pass** described in the rules above, for a brand-safety and liability review of Granola's published SEO articles.

Operating instructions:
- Read EVERY sentence of EVERY segment against the governing test. Judge meaning and reader takeaway in the context of the surrounding paragraph — not which words appear.
- Work independently. Do NOT restrict yourself to sentences containing suspicious words; a sentence with no flagged term can fail badly ("there's no awkward moment where you have to explain what the app is doing" has no flagged word and fails).
- A miss is expensive; a false positive is cheap. Bias hard toward flagging. If you are unsure, flag it as amber rather than staying silent.
- Every text-bearing field is in scope, including the title, the meta/summary, headings, list items, table cells, link anchor text and CTA text — a flagged phrase in a meta description is just as public as one in paragraph three.
- Apply the context rules for AMBER exactly as written; they override your own judgment. "Invisible" is RED in all uses. "Your conversations are never recorded" is flagged regardless.
- Use disposition \`about-competitor\` for text describing a competitor's behaviour; still report it — those sit closest to the line.
- Use \`cleared-negated\` / \`cleared-in-context\` for text you considered and are clearing; still report it with your reasoning. Nothing is silently cleared.

CRITICAL — quoting: every \`quote\` must be copied VERBATIM from the segment text, character for character. It must be findable by exact substring search. Do not paraphrase, normalise punctuation or quotation marks, add ellipses, or fix typos. Quote a single sentence or clause, not an entire long segment.`;

  const user = `ARTICLE
Title: ${post.title}
Slug: ${post.slug}

SEGMENTS (each is one text-bearing field; quote from these exactly):

${renderSegments(segments)}`;

  const { input, usage } = await callTool({ system, user, tool: SEMANTIC_TOOL });
  return { findings: input.findings || [], usage };
}

// ---- 1b. Repair unanchorable quotes ---------------------------------------
// A quote that cannot be found verbatim is, as written, a fabricated finding.
// Rather than discard it (which would drop a possibly-real finding) or
// fuzzy-match it (which the rules forbid), we hand the model the exact failures
// and the true segment text and ask it to re-quote EXACTLY. Anything still
// unanchorable after this fails the article's build loudly.
const REPAIR_TOOL = {
  name: 'repair_quotes',
  description: 'Re-quote each failed finding verbatim from the segment text provided.',
  input_schema: {
    type: 'object',
    properties: {
      repairs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            failure_index: { type: 'integer' },
            corrected_quote: {
              type: 'string',
              description: 'The same passage, copied character-for-character from the segment text. Empty string if the finding was mistaken and should be withdrawn.',
            },
            withdraw: { type: 'boolean', description: 'True if this finding was mistaken and should be withdrawn entirely.' },
          },
          required: ['failure_index', 'corrected_quote', 'withdraw'],
        },
      },
    },
    required: ['repairs'],
  },
};

export async function repairQuotes({ failures }) {
  if (failures.length === 0) return { repairs: [] };
  const system = `You previously reported findings for a consent-and-disclosure review, but some of your quotes could not be found verbatim in the source text — they were paraphrased, re-punctuated, or truncated mid-character.

For each failure below you are given the FULL text of the segment. Return the SAME passage you intended, copied character-for-character from that segment text so that an exact substring search will find it. Do not shorten to a fragment that changes meaning, and do not substitute a different passage.

If on re-reading you believe the finding was mistaken and there is no passage worth flagging, set withdraw=true. Withdrawing is recorded, not silent — do not use it to avoid the re-quoting work.`;

  const user = failures.map((f, i) => `#${i}
intended quote (NOT found verbatim): "${f.quote}"
segment id: ${f.segmentId}
FULL segment text:
"""
${f.segmentText}
"""`).join('\n\n');

  const { input } = await callTool({ system, user, tool: REPAIR_TOOL, maxTokens: 8000 });
  return { repairs: input.repairs || [] };
}

// ---- 2. Adjudicate Layer A lexicon hits -----------------------------------
export async function adjudicateLexicon({ rulesText, post, hits }) {
  if (hits.length === 0) return { dispositions: [], usage: null };

  const system = `${rulesText}

---
You are dispositioning **Layer A lexicon hits** for a brand-safety and liability review of Granola's published SEO articles.

Each hit below is a literal term match found by a deterministic script, with its surrounding sentence. Assign EXACTLY ONE disposition to every hit, using the disposition list in the rules.

- Apply the context rules for AMBER exactly as written; they override your own judgment. "Invisible" is RED in all uses. "Your conversations are never recorded" is flagged regardless.
- \`about-competitor\` — the sentence describes a competitor's behaviour, not Granola's.
- \`cleared-negated\` — the term is present but negated.
- \`cleared-in-context\` — legitimately used (e.g. "private" making a genuine data-handling claim about where notes are stored).
- A miss is expensive; a false positive is cheap. When genuinely torn between clearing and amber, choose amber.
- You must return one entry for EVERY hit index. Nothing is silently dropped.`;

  const user = `ARTICLE
Title: ${post.title}
Slug: ${post.slug}

LEXICON HITS (${hits.length} total):

${hits.map((h, i) => `#${i} [${h.tier.toUpperCase()} term: "${h.term}"] in ${h.label}
  matched text: "${h.quote}"
  sentence: "${h.sentence}"`).join('\n\n')}`;

  const { input, usage } = await callTool({ system, user, tool: ADJUDICATE_TOOL });
  return { dispositions: input.dispositions || [], usage };
}
