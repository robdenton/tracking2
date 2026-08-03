// Layer A — deterministic lexicon scan. A script, not judgment.
// Case-insensitive, matching the RULES.md terms AND their morphological
// variants. Every hit is emitted with its surrounding sentence. This layer is
// the safety net: zero misses on literal terms.
//
// Output findings are anchored by (segmentId, start, end) with the verbatim
// matched text, so the renderer can highlight by exact string match.

import { extractSegments, splitSentences } from './extract.mjs';

// Morphological families. Each entry: canonical term -> regex covering the
// listed variants. \b boundaries; case-insensitive at match time.
// RED single terms (+ variants explicitly named in RULES.md).
const RED_PATTERNS = [
  ['secretly', /\bsecret(?:ly|s|cy)?\b/gi],           // secret / secretly / secrecy
  ['stealth', /\bstealth(?:y|ily|ed)?\b/gi],           // stealth / stealthy / stealthily
  ['hidden', /\bhidden\b|\bhid(?:e|es|ing)\b/gi],      // hidden / hide / hiding
  ['undetectable', /\bundetect(?:able|ably|ed)\b/gi],  // undetected / undetectable
  ['invisible', /\binvisibl(?:e|y)\b|\binvisibility\b/gi],
  ['covert', /\bcovert(?:ly)?\b/gi],
  ['spy', /\bspy(?:ing|ware)?\b|\bspies\b/gi],
];
// RED multiword phrases.
const RED_PHRASES = [
  ['discreetly records', /\bdiscreet(?:ly)?\s+record(?:s|ed|ing)?\b/gi],
  ['no one knows', /\bno\s?one\s+knows\b/gi],
  ['nobody knows', /\bnobody\s+knows\b/gi],
  ['silently records', /\bsilent(?:ly)?\s+record(?:s|ed|ing)?\b/gi],
  ['secretly listens', /\bsecret(?:ly)?\s+listen(?:s|ed|ing)?\b/gi],
  ['no one can tell', /\bno\s?one\s+can\s+tell\b/gi],
  ['invisible to everyone', /\binvisibl[ey]\s+to\s+(?:everyone|everybody|others|other participants)\b/gi],
];
// "discreet" on its own is a RED-family morphological variant per RULES.md
// (discreet / discreetly), so scan it too — the phrase list above only covers
// "discreetly records".
const RED_EXTRA = [
  ['discreet', /\bdiscreet(?:ly)?\b/gi],
  ['undetected', /\bundetected\b/gi],
  ['silent', /\bsilent(?:ly)?\b/gi],   // 'silent/silently' named in the variants line
];

const AMBER_PATTERNS = [
  ['private', /\bprivate(?:ly)?\b|\bprivacy\b/gi],
  ['secure', /\bsecure(?:ly|d)?\b|\bsecurity\b/gi],
  ['compliant', /\bcompliant\b|\bcompliance\b/gi],
  ['encrypted', /\bencrypt(?:ed|ion|s)?\b/gi],
  ['local', /\blocal(?:ly)?\b/gi],
  ['automatic', /\bautomatic(?:ally)?\b|\bautomated\b/gi],
  ['effortless', /\beffortless(?:ly)?\b/gi],
  ['no bot', /\bno\s+(?:meeting\s+)?bots?\b|\bwithout\s+(?:a\s+)?bots?\b|\bbot-free\b/gi],
  ['in the background', /\bin\s+the\s+background\b|\bbackground\b/gi],
  ['works silently', /\bworks?\s+silent(?:ly)?\b/gi],
  ['never recorded', /\bnever\s+record(?:ed|s|ing)?\b|\bnot\s+recorded\b/gi],
];

// ACCURACY patterns — claims that data stays off Granola's servers. Per the
// brand owner notes ARE cloud-stored, so these are factually false.
//
// Deliberately narrow. A loose pattern such as /your (?:notes|data) stays?/
// matches "Your notes stay in black. AI additions appear in gray." 81 times
// across the corpus — that is text colour, not storage, and flagging it would
// bury the real hits.
const ACCURACY_PATTERNS = [
  ['never leaves your device', /\bnever\s+leaves?\s+(?:your|the)\s+(?:device|machine|mac|computer|laptop|desktop)\b/gi],
  ['stays on your device', /\b(?:stays?|remains?|lives?|kept)\s+(?:only\s+)?on\s+(?:your|the)\s+(?:device|machine|mac|computer|laptop)\b/gi],
  ['no cloud', /\bno\s+cloud\s+(?:dependency|storage|sync|upload|servers?)\b|\b(?:not|never)\s+(?:stored|saved|kept|uploaded)\s+(?:in|to)\s+the\s+cloud\b|\bwithout\s+(?:the\s+)?cloud\b/gi],
  ['stored locally / on-device', /\b(?:stored|saved|kept|held|processed)\s+(?:entirely\s+|only\s+|100%\s+)?(?:locally|on[- ]device)\b/gi],
  ['local-only', /\b(?:local[- ]only|on[- ]device only|entirely local|fully local|100% local|runs? locally with no)\b/gi],
  ['no third-party server', /\b(?:no|never|without|zero)\s+third[- ]party\s+(?:servers?|storage|infrastructure|cloud|systems?)\b|\bnot\s+(?:on|stored on)\s+(?:a\s+)?third[- ]party\s+servers?\b/gi],
  ['never uploaded', /\bnever\s+(?:uploaded|transmitted|sent to (?:our|the) (?:server|cloud))\b/gi],
];

// 'invisible' appears in BOTH lists in RULES.md; the context table says treat
// it as RED in all uses. It is therefore scanned as RED only (above) to avoid
// duplicate findings for the same span.

function scanWith(patterns, tier, seg, sentences, out, seen) {
  for (const [term, re] of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(seg.text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      const key = `${seg.id}:${start}:${end}`;
      // A span already claimed by a RED pattern is not re-emitted as AMBER.
      if (seen.has(key)) continue;
      seen.add(key);
      const sentence = sentences.find((s) => start >= s.start && start < s.end);
      out.push({
        layer: 'A',
        tier,                       // 'red' | 'amber'
        term,
        segmentId: seg.id,
        field: seg.field,
        label: seg.label,
        quote: m[0],
        start,
        end,
        sentence: sentence ? sentence.text : seg.text,
        sentenceStart: sentence ? sentence.start : 0,
        sentenceEnd: sentence ? sentence.end : seg.text.length,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
}

// Scan one post. Returns findings in document order.
export function scanPost(post) {
  const segs = extractSegments(post);
  const out = [];
  for (const seg of segs) {
    // Link URLs are scanned too (a slug/href can carry a flagged term), but
    // sentence context for a URL is just the URL itself.
    const sentences = splitSentences(seg.text);
    const seen = new Set();
    scanWith(ACCURACY_PATTERNS, 'accuracy', seg, sentences, out, seen);
    scanWith(RED_PATTERNS, 'red', seg, sentences, out, seen);
    scanWith(RED_PHRASES, 'red', seg, sentences, out, seen);
    scanWith(RED_EXTRA, 'red', seg, sentences, out, seen);
    scanWith(AMBER_PATTERNS, 'amber', seg, sentences, out, seen);
  }
  // Document order: by segment index then offset.
  const order = new Map(segs.map((s, i) => [s.id, i]));
  out.sort((a, b) => order.get(a.segmentId) - order.get(b.segmentId) || a.start - b.start);
  return out;
}

// Scan arbitrary text (used by the canary harness).
export function scanText(text, field = 'paragraph') {
  const fake = { title: '', slug: '', summary: '', body: [{ _type: 'block', style: 'normal', children: [{ text }] }] };
  if (field === 'title') return scanPost({ title: text, slug: '', summary: '', body: [] });
  return scanPost(fake);
}
