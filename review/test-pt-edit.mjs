#!/usr/bin/env npx tsx
// Tests for the formatted-block editor. Every case here is a shape that
// previously forced a refusal ("edit by hand in the Studio") or, worse, a
// corruption risk. Run: npx tsx review/test-pt-edit.mjs

// apps/web has no `"type": "module"`, so tsx compiles the TS as CommonJS when
// imported from this .mjs — named imports fail. Namespace + interop instead.
import * as ns from "../apps/web/src/lib/pt-edit.ts";
const { rebuildChildren, editHtmlText, blockText, tagSkeleton } = ns.default ?? ns;

let pass = 0;
let fail = 0;
const t = (name, fn) => {
  try {
    fn();
    pass++;
    console.log(`ok    ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL  ${name}\n      ${e.message}`);
  }
};
const eq = (got, want, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`${what}\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`);
  }
};
const throws = (fn, snippet) => {
  try { fn(); } catch (e) {
    if (String(e.message).includes(snippet)) return;
    throw new Error(`threw the wrong error: ${e.message}`);
  }
  throw new Error(`expected an error containing "${snippet}"`);
};

// The real block shape from the corpus: text, link, text.
const linkedBlock = () => ({
  _key: "blk1",
  _type: "block",
  style: "normal",
  children: [
    { _key: "s1", _type: "span", marks: [], text: "Templates and an " },
    { _key: "s2", _type: "span", marks: ["L1"], text: "AI notepad" },
    { _key: "s3", _type: "span", marks: [], text: " that respects confidentiality." },
  ],
  markDefs: [{ _key: "L1", _type: "link", href: "https://www.granola.ai/x" }],
});

// --- rebuildChildren --------------------------------------------------------

t("edit inside one span leaves the link untouched", () => {
  const b = linkedBlock();
  const r = rebuildChildren(b, 0, "Templates".length, "Structured templates");
  eq(blockText({ children: r.children }), "Structured templates and an AI notepad that respects confidentiality.");
  const link = r.children.find((c) => (c.marks ?? []).includes("L1"));
  eq(link?.text, "AI notepad", "link text");
  eq(r.markDefs.length, 1, "markDefs kept");
  eq(r.dropped.length, 0, "nothing dropped");
});

t("paragraph replace keeps the link when its text survives", () => {
  const b = linkedBlock();
  const full = blockText(b);
  const r = rebuildChildren(b, 0, full.length, "Use an AI notepad to stay present.");
  eq(blockText({ children: r.children }), "Use an AI notepad to stay present.");
  const link = r.children.find((c) => (c.marks ?? []).includes("L1"));
  eq(link?.text, "AI notepad", "link re-anchored");
  eq(r.markDefs.length, 1, "markDef kept");
  eq(r.dropped.length, 0);
});

t("paragraph replace reports the dropped link when its text is gone", () => {
  const b = linkedBlock();
  const full = blockText(b);
  const r = rebuildChildren(b, 0, full.length, "A rewritten paragraph with no anchor text.");
  eq(r.dropped.length, 1, "one dropped mark");
  eq(r.dropped[0].href, "https://www.granola.ai/x", "href reported");
  eq(r.markDefs.length, 0, "orphaned markDef pruned");
});

t("cross-span replace preserves untouched head and tail", () => {
  const b = linkedBlock();
  const full = blockText(b);
  // Replace from inside span1 through inside span3 (crosses the link).
  const start = "Templates".length;                    // " and an AI notepad that respects"
  const end = full.indexOf(" confidentiality.");
  const r = rebuildChildren(b, start, end, " without a specific tool");
  eq(blockText({ children: r.children }), "Templates without a specific tool confidentiality.");
  eq(r.dropped.length, 1, "link inside the range is reported dropped");
});

t("bold mid-span survives an edit elsewhere in the block", () => {
  const b = {
    _key: "b2", _type: "block",
    children: [
      { _key: "x1", _type: "span", marks: [], text: "Start " },
      { _key: "x2", _type: "span", marks: ["strong"], text: "bold bit" },
      { _key: "x3", _type: "span", marks: [], text: " end here." },
    ],
    markDefs: [],
  };
  const full = blockText(b);
  const r = rebuildChildren(b, full.indexOf(" end here."), full.length, " finish line.");
  eq(blockText({ children: r.children }), "Start bold bit finish line.");
  eq(r.children.find((c) => (c.marks ?? []).includes("strong"))?.text, "bold bit");
});

t("adjacent same-mark spans merge; keys are deterministic", () => {
  const b = linkedBlock();
  const r1 = rebuildChildren(b, 0, 5, "Notes");
  const r2 = rebuildChildren(b, 0, 5, "Notes");
  eq(r1.children.map((c) => c._key), r2.children.map((c) => c._key), "same edit, same keys");
  // No two adjacent spans with identical marks.
  for (let i = 1; i < r1.children.length; i++) {
    const a = [...(r1.children[i - 1].marks ?? [])].sort().join(",");
    const c = [...(r1.children[i].marks ?? [])].sort().join(",");
    if (a === c) throw new Error("adjacent spans share marks — should have merged");
  }
});

t("empty replacement deletes the range and never leaves zero spans", () => {
  const b = { _key: "b3", _type: "block", children: [{ _key: "y", _type: "span", marks: [], text: "Delete me." }], markDefs: [] };
  const r = rebuildChildren(b, 0, 10, "");
  eq(r.children.length >= 1, true, "at least one span");
  eq(blockText({ children: r.children }), "");
});

t("out-of-range throws", () => {
  throws(() => rebuildChildren(linkedBlock(), 0, 10_000, "x"), "outside");
});

// --- editHtmlText -----------------------------------------------------------

const TABLE = `<table><thead><tr><th style="width:22%">Field</th></tr></thead><tbody><tr><td style="padding:12px">Deleted immediately after transcription</td><td>Notes &amp; transcripts sync</td></tr></tbody></table>`;

t("plain replacement keeps the tag skeleton", () => {
  const r = editHtmlText(TABLE, "Deleted immediately after transcription", "Audio deleted after notes are generated");
  eq(r.html.includes("Audio deleted after notes are generated"), true);
  eq(tagSkeleton(r.html), tagSkeleton(TABLE), "skeleton unchanged");
});

t("entity-encoded text is found and replaced at the right raw offsets", () => {
  const r = editHtmlText(TABLE, "Notes & transcripts sync", "Notes & transcripts sync to Granola's servers");
  eq(r.html.includes("Notes &amp; transcripts sync to Granola&amp;#x27;s servers".slice(0, 10)), true, "replaced");
  eq(tagSkeleton(r.html), tagSkeleton(TABLE), "skeleton unchanged");
  eq(r.html.includes("&amp;"), true, "ampersand re-encoded");
});

t("occurrence disambiguates repeated text", () => {
  const html = `<td>Same text</td><td>Same text</td>`;
  const r = editHtmlText(html, "Same text", "Changed", 1);
  eq(r.html, `<td>Same text</td><td>Changed</td>`);
});

t("repeated text without occurrence still counts matches", () => {
  const html = `<td>Same text</td><td>Same text</td>`;
  const r = editHtmlText(html, "Same text", "Changed", 0);
  eq(r.matches, 2, "reports both matches");
});

t("quote spanning a <br> now succeeds (the 93 blocked table findings)", () => {
  const html = `<th style="width:22%">Participant<br>visibility</th>`;
  const r = editHtmlText(html, "Participant visibility", "How the tool captures audio");
  eq(r.html, `<th style="width:22%">How the tool captures audio</th>`);
});

t("quote straddling a structural tag still refuses", () => {
  throws(
    () => editHtmlText(`<td>Deleted</td><td>immediately</td>`, "Deleted immediately", "x"),
    "not found",
  );
});

t("a <br> outside the edit range is untouched", () => {
  const html = `<th>Unstructured<br>notes</th><td>plain text</td>`;
  const r = editHtmlText(html, "plain text", "changed");
  eq(r.html, `<th>Unstructured<br>notes</th><td>changed</td>`);
});

t("replacement containing markup is neutralised, not injected", () => {
  const r = editHtmlText(`<td>plain</td>`, "plain", `<script>alert(1)</script>`);
  eq(r.html.includes("<script>"), false, "no tag injected");
  eq(tagSkeleton(r.html), tagSkeleton(`<td>plain</td>`), "skeleton unchanged");
});

t("missing text refuses loudly", () => {
  throws(() => editHtmlText(TABLE, "not in the table at all", "x"), "not found");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
