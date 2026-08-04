import { createHash } from "node:crypto";

// Surgery on Portable Text blocks that carry formatting.
//
// A block is an array of keyed spans, each with its own marks, plus a markDefs
// table holding link annotations that spans reference by key:
//
//   children: [ {_key:"a", marks:[],      text:"…using an "},
//               {_key:"b", marks:["L1"],  text:"AI notepad"},      <- the link
//               {_key:"c", marks:[],      text:" that respects…"} ]
//   markDefs: [ {_key:"L1", _type:"link", href:"https://…"} ]
//
// Editing text that lives inside ONE span is a plain text swap. Editing across
// spans, or replacing a whole paragraph, needs the children array rebuilt — and
// that is where links get destroyed if you are careless. This module rebuilds
// it while keeping every mark it can, and REPORTS every mark it cannot, so a
// dropped link is never silent.
//
// Pure and synchronous on purpose: all of this is unit-tested without a network.

export interface PtSpan {
  _key?: string;
  _type?: string;
  marks?: string[];
  text?: string;
}

export interface PtMarkDef {
  _key?: string;
  _type?: string;
  href?: string;
  [k: string]: unknown;
}

export interface PtBlockNode {
  _key?: string;
  _type?: string;
  children?: PtSpan[];
  markDefs?: PtMarkDef[];
  html?: string;
  style?: string;
}

export interface DroppedMark {
  /** The text that used to carry the annotation. */
  text: string;
  /** Link target, when the annotation was a link. */
  href?: string;
  type: string;
}

export interface RebuildResult {
  children: PtSpan[];
  markDefs: PtMarkDef[];
  /** Annotations that could not be carried across — surface these to the user. */
  dropped: DroppedMark[];
}

/** Deterministic span key, so re-running an identical edit is idempotent. */
function spanKey(blockKey: string, text: string, index: number): string {
  return createHash("sha256")
    .update(`${blockKey}|${index}|${text}`)
    .digest("hex")
    .slice(0, 12);
}

/** Concatenated visible text of a block, which is what findings quote against. */
export function blockText(block: PtBlockNode): string {
  return (block.children ?? []).map((c) => c.text ?? "").join("");
}

/**
 * Which marks apply at each character offset of the block's text. Used to work
 * out what an edited range was carrying before it was replaced.
 */
function marksByOffset(children: PtSpan[]): string[][] {
  const out: string[][] = [];
  for (const c of children) {
    const t = c.text ?? "";
    for (let i = 0; i < t.length; i++) out.push(c.marks ?? []);
  }
  return out;
}

/**
 * Replace [start, end) of a block's text with `replacement`, rebuilding the
 * children array.
 *
 * Marks outside the replaced range are preserved exactly. Marks *inside* it are
 * re-anchored where the annotated text survives verbatim in the replacement —
 * so a paragraph rewrite that still says "AI notepad" keeps the link on it.
 * Anything that cannot be re-anchored is dropped and reported.
 */
export function rebuildChildren(
  block: PtBlockNode,
  start: number,
  end: number,
  replacement: string,
): RebuildResult {
  const children = block.children ?? [];
  const markDefs = block.markDefs ?? [];
  const full = blockText(block);
  const blockKey = block._key ?? "blk";

  if (start < 0 || end > full.length || start > end) {
    throw new Error(`rebuildChildren: range ${start}-${end} outside 0-${full.length}`);
  }

  const offsets = marksByOffset(children);
  const before = full.slice(0, start);
  const after = full.slice(end);

  // Marks that appeared anywhere inside the replaced range, with the text they
  // covered — the candidates for re-anchoring.
  const insideMarks = new Map<string, string>();
  for (let i = start; i < end; i++) {
    for (const m of offsets[i] ?? []) {
      insideMarks.set(m, (insideMarks.get(m) ?? "") + full[i]);
    }
  }

  // Split `replacement` into runs, applying any inside-mark whose original text
  // still appears verbatim. Longest first so a nested/overlapping annotation
  // does not get claimed by a shorter one.
  type Run = { text: string; marks: string[] };
  let runs: Run[] = [{ text: replacement, marks: [] }];
  const dropped: DroppedMark[] = [];

  const candidates = [...insideMarks.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [markKey, markText] of candidates) {
    if (!markText.trim()) continue;
    let placed = false;
    const next: Run[] = [];
    for (const run of runs) {
      const at = run.marks.length === 0 && !placed ? run.text.indexOf(markText) : -1;
      if (at === -1) {
        next.push(run);
        continue;
      }
      if (at > 0) next.push({ text: run.text.slice(0, at), marks: run.marks });
      next.push({ text: markText, marks: [...run.marks, markKey] });
      const tailAt = at + markText.length;
      if (tailAt < run.text.length) next.push({ text: run.text.slice(tailAt), marks: run.marks });
      placed = true;
    }
    runs = next;
    if (!placed) {
      const def = markDefs.find((d) => d._key === markKey);
      dropped.push({
        text: markText,
        href: typeof def?.href === "string" ? def.href : undefined,
        type: typeof def?._type === "string" ? def._type : "decorator",
      });
    }
  }

  // Rebuild: the untouched head, the replacement runs, the untouched tail. The
  // head and tail keep their original per-character marks, so a link that sits
  // wholly outside the edit is bit-for-bit preserved.
  const rebuilt: PtSpan[] = [];
  const pushRange = (from: number, to: number) => {
    let i = from;
    while (i < to) {
      const marks = offsets[i] ?? [];
      let j = i + 1;
      while (j < to && sameMarks(offsets[j] ?? [], marks)) j++;
      rebuilt.push({ _type: "span", marks: [...marks], text: full.slice(i, j) });
      i = j;
    }
  };

  pushRange(0, start);
  for (const r of runs) {
    if (r.text === "") continue;
    rebuilt.push({ _type: "span", marks: [...r.marks], text: r.text });
  }
  pushRange(end, full.length);

  // A block must never end up with zero spans.
  if (rebuilt.length === 0) rebuilt.push({ _type: "span", marks: [], text: "" });

  // Merge adjacent spans carrying identical marks, then assign stable keys.
  const merged: PtSpan[] = [];
  for (const s of rebuilt) {
    const prev = merged[merged.length - 1];
    if (prev && sameMarks(prev.marks ?? [], s.marks ?? [])) {
      prev.text = (prev.text ?? "") + (s.text ?? "");
    } else {
      merged.push({ ...s });
    }
  }
  merged.forEach((s, i) => {
    s._key = spanKey(blockKey, s.text ?? "", i);
  });

  // Drop markDefs nothing references any more, so the document stays clean.
  const used = new Set(merged.flatMap((s) => s.marks ?? []));
  const keptDefs = markDefs.filter((d) => (d._key ? used.has(d._key) : true));

  void before;
  void after;
  return { children: merged, markDefs: keptDefs, dropped };
}

function sameMarks(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

// --- rawHtml ---------------------------------------------------------------

/**
 * The tag skeleton of an HTML string: every tag in order, with text removed.
 * Comparing skeletons before and after an edit proves the edit changed only
 * text, never structure or attributes — which is what makes editing table
 * markup safe without a full parser.
 *
 * `<br>` is excluded: it is a void formatting tag inside a cell, not structure,
 * and quotes legitimately span it ("Participant<br>visibility" is flagged as
 * "Participant visibility"). An edit is allowed to consume one.
 */
const BR = /^<br\s*\/?\s*>$/i;

export function tagSkeleton(html: string): string {
  return (html.match(/<[^>]*>/g) ?? []).filter((t) => !BR.test(t)).join("");
}

/** Decode the entities that appear in this corpus, so quotes match raw markup. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

export interface HtmlEditResult {
  html: string;
  /** How many candidate matches were found before disambiguation. */
  matches: number;
}

const ENTITIES: [string, string][] = [
  ["&nbsp;", " "],
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&apos;", "'"],
  ["&mdash;", "—"],
  ["&ndash;", "–"],
];

/**
 * Decode entities while recording, for every decoded character, the raw-string
 * range it came from. This is what lets a match found in decoded space be
 * spliced back into the raw markup at exactly the right place — an index into
 * the decoded string is meaningless against the raw one ("&amp;" is five raw
 * characters but one decoded character).
 */
function decodeWithMap(html: string): { decoded: string; rawStart: number[]; rawEnd: number[] } {
  let decoded = "";
  const rawStart: number[] = [];
  const rawEnd: number[] = [];
  let i = 0;
  while (i < html.length) {
    // <br> decodes to a space — the same rendering the segment extractor uses,
    // so quotes like "Participant visibility" match "Participant<br>visibility".
    if (html[i] === "<") {
      const m = html.slice(i, i + 7).match(/^<br\s*\/?\s*>/i);
      if (m) {
        decoded += " ";
        rawStart.push(i);
        rawEnd.push(i + m[0].length);
        i += m[0].length;
        continue;
      }
    }
    let hit: [string, string] | null = null;
    if (html[i] === "&") {
      for (const e of ENTITIES) {
        if (html.startsWith(e[0], i)) { hit = e; break; }
      }
    }
    if (hit) {
      decoded += hit[1];
      for (let k = 0; k < hit[1].length; k++) { rawStart.push(i); rawEnd.push(i + hit[0].length); }
      i += hit[0].length;
    } else {
      decoded += html[i];
      rawStart.push(i);
      rawEnd.push(i + 1);
      i++;
    }
  }
  return { decoded, rawStart, rawEnd };
}

/** Minimal encoding so a replacement can never introduce markup of its own. */
function encodeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Replace `original` with `replacement` inside an HTML string, keeping the
 * markup intact.
 *
 * Matching happens in entity-decoded space — "Notes & transcripts" in a
 * finding matches "Notes &amp; transcripts" in the markup — and the splice
 * happens in raw space via the offset map. Refuses rather than guesses: if the
 * text cannot be located, straddles a tag, or the result would alter the tag
 * structure, it throws. `occurrence` disambiguates repeated text.
 */
export function editHtmlText(
  html: string,
  original: string,
  replacement: string,
  occurrence = 0,
): HtmlEditResult {
  const { decoded, rawStart, rawEnd } = decodeWithMap(html);
  const needle = decodeEntities(original);
  if (!needle) throw new Error("Empty text to replace.");

  const positions: number[] = [];
  let at = decoded.indexOf(needle);
  while (at !== -1) {
    positions.push(at);
    at = decoded.indexOf(needle, at + 1);
  }
  if (positions.length === 0) {
    throw new Error("Text not found in the table markup, even allowing for HTML entities.");
  }
  if (occurrence >= positions.length) {
    throw new Error(
      `Asked for occurrence ${occurrence + 1} but the text appears ${positions.length}× in the table.`,
    );
  }

  const d0 = positions[occurrence];
  const r0 = rawStart[d0];
  const r1 = rawEnd[d0 + needle.length - 1];

  // If the raw range contains structural markup, the quote straddles a tag
  // boundary (e.g. "range</td><td>text") — replacing it would delete the tag.
  // <br> inside the range is fine: it decoded to the space the quote matched
  // on, and consuming it is a formatting change, not a structural one.
  const rawSlice = html.slice(r0, r1).replace(/<br\s*\/?\s*>/gi, "");
  if (/[<>]/.test(rawSlice)) {
    throw new Error("The quoted text spans an HTML tag — edit this one by hand in the Studio.");
  }

  const out = html.slice(0, r0) + encodeText(replacement) + html.slice(r1);

  if (tagSkeleton(out) !== tagSkeleton(html)) {
    throw new Error("Refusing to write: the edit would change the table's HTML structure.");
  }
  return { html: out, matches: positions.length };
}
