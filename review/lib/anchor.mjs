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
//
// If a finding already carries exact offsets (Layer A's scanner knows precisely
// where it matched), those are TRUSTED after verification. Re-deriving them with
// indexOf would collapse every repeat of a term onto its first occurrence —
// silently un-highlighting the 2nd..nth occurrence and making distinct findings
// indistinguishable. Only model-supplied quotes (Layer B) are located by search.
export function anchorFindings(findings, segments) {
  const byId = new Map(segments.map((s) => [s.id, s]));
  const anchored = [];
  const errors = [];
  // Track spans already claimed, so a repeated Layer B quote anchors to the
  // next free occurrence rather than piling onto the first.
  const claimed = new Map();
  for (const f of findings) {
    const seg = byId.get(f.segmentId);
    if (!seg) {
      errors.push({ finding: f, reason: `unknown segment id "${f.segmentId}"` });
      continue;
    }
    try {
      let start, end, ambiguous = false;
      if (Number.isInteger(f.start) && Number.isInteger(f.end)
          && seg.text.slice(f.start, f.end) === f.quote) {
        // Exact offsets supplied and verified against the rendered text.
        start = f.start; end = f.end;
      } else {
        // Search. Skip occurrences already claimed by an earlier finding.
        const taken = claimed.get(seg.id) || new Set();
        let idx = seg.text.indexOf(f.quote);
        while (idx !== -1 && taken.has(idx)) idx = seg.text.indexOf(f.quote, idx + 1);
        if (idx === -1) {
          // All occurrences claimed — fall back to strict anchoring so a
          // genuinely unlocatable quote still fails loudly.
          const r = anchorQuote(seg, f.quote);
          start = r.start; end = r.end; ambiguous = r.ambiguous;
        } else {
          start = idx; end = idx + f.quote.length;
          ambiguous = seg.text.indexOf(f.quote, idx + 1) !== -1;
        }
      }
      if (!claimed.has(seg.id)) claimed.set(seg.id, new Set());
      claimed.get(seg.id).add(start);
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
