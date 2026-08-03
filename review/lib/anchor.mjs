// Build-time anchoring and assertions (Step 6).
//
// The highlighting IS the verification. Every finding is anchored by exact
// string match against the SAME extracted segment text the page renders, and
// offsets are computed from that string. A quote that cannot be located
// verbatim is a fabricated finding — we fail the article's build loudly rather
// than fuzzy-matching, paraphrasing, or silently dropping the highlight.

export class AnchorError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'AnchorError';
    this.detail = detail;
  }
}

// Locate a verbatim quote inside a segment. Returns {start,end}.
// Throws AnchorError if it cannot be found EXACTLY.
export function anchorQuote(segment, quote) {
  if (typeof quote !== 'string' || quote.length === 0) {
    throw new AnchorError('empty quote', { segmentId: segment?.id, quote });
  }
  const idx = segment.text.indexOf(quote);
  if (idx === -1) {
    throw new AnchorError('quote not found verbatim in segment', {
      segmentId: segment.id,
      quote,
      segmentText: segment.text.slice(0, 400),
    });
  }
  // Ambiguity is not an error — first occurrence is deterministic — but record it.
  const second = segment.text.indexOf(quote, idx + 1);
  return { start: idx, end: idx + quote.length, ambiguous: second !== -1 };
}

// Anchor a whole finding list against the segment map.
// Returns { anchored, errors } — callers decide whether errors fail the build.
export function anchorFindings(findings, segments) {
  const byId = new Map(segments.map((s) => [s.id, s]));
  const anchored = [];
  const errors = [];
  for (const f of findings) {
    const seg = byId.get(f.segmentId);
    if (!seg) {
      errors.push({ finding: f, reason: `unknown segment id "${f.segmentId}"` });
      continue;
    }
    try {
      const { start, end, ambiguous } = anchorQuote(seg, f.quote);
      anchored.push({ ...f, start, end, ambiguous, label: seg.label, field: seg.field });
    } catch (e) {
      errors.push({ finding: f, reason: e.message, detail: e.detail });
    }
  }
  return { anchored, errors };
}

// Reconcile lexicon hits: the count from the deterministic scan must equal the
// number of lexicon-sourced findings rendered. Mismatch fails the build.
export function reconcileLexicon(scanHitCount, renderedLexiconFindingCount) {
  if (scanHitCount !== renderedLexiconFindingCount) {
    throw new AnchorError(
      `lexicon reconciliation failed: scan found ${scanHitCount} hits but ${renderedLexiconFindingCount} lexicon findings rendered`,
      { scanHitCount, renderedLexiconFindingCount },
    );
  }
  return true;
}

// Merge overlapping/adjacent finding spans within a segment into render ranges.
// Each range carries the finding numbers it covers so one highlight can point
// at several findings. Sorted by start.
export function buildRanges(findingsForSegment) {
  const sorted = [...findingsForSegment].sort((a, b) => a.start - b.start || a.end - b.end);
  const ranges = [];
  for (const f of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && f.start < last.end) {
      last.end = Math.max(last.end, f.end);
      last.findings.push(f);
    } else {
      ranges.push({ start: f.start, end: f.end, findings: [f] });
    }
  }
  return ranges;
}
