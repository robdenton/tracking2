// The edit-planning layer: given a finding, work out the exact Sanity patch.
//
// Extracted from the decisions route so single-decision applies (the review
// UI) and batch applies (the auto-edit pipeline) run through ONE code path —
// two implementations of splicing logic would drift, and this file is where
// the corruption bugs historically lived.

import { readEditableDoc } from "@/lib/seo-review";
import {
  rebuildChildren,
  editHtmlText,
  blockText,
  type PtBlockNode,
} from "@/lib/pt-edit";

// A plan is either a single-path patch, a multi-path set (used when a
// formatted block's children array must be rebuilt — children and markDefs
// change together, atomically), or a refusal.
export type PatchPlan =
  | { path: string; newValue?: string; unset?: boolean }
  | { sets: Record<string, unknown>; warning?: string }
  | { error: string };

// Rebuild a block around [start, end) -> replacement, preserving marks. Links
// whose text survives the rewrite are re-anchored; anything genuinely dropped
// is reported in the warning so it reaches the UI rather than vanishing.
function rebuildToSets(
  block: PtBlockNode,
  start: number,
  end: number,
  replacement: string,
  blockKey: string,
): PatchPlan {
  try {
    const r = rebuildChildren(block, start, end, replacement);
    const warning = r.dropped.length
      ? `Formatting could not be carried into the rewrite — re-add by hand in the Studio: ${r.dropped
          .map((d) => (d.href ? `link "${d.text}" → ${d.href}` : `${d.type} on "${d.text}"`))
          .join("; ")}`
      : undefined;
    return {
      sets: {
        [`body[_key=="${blockKey}"].children`]: r.children,
        [`body[_key=="${blockKey}"].markDefs`]: r.markDefs,
      },
      warning,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "block rebuild failed" };
  }
}

// Locate [start, end) inside a single span, if it fits in one.
function soloSpanFor(
  block: PtBlockNode,
  start: number,
  end: number,
): { child: NonNullable<PtBlockNode["children"]>[number]; index: number; local: number } | null {
  const children = block.children ?? [];
  let off = 0;
  for (let i = 0; i < children.length; i++) {
    const t = children[i].text ?? "";
    if (start >= off && end <= off + t.length) return { child: children[i], index: i, local: start - off };
    off += t.length;
  }
  return null;
}

// Address a span by its _key, never by index. Sanity's own guidance: array
// indices go stale the moment anything edits the block concurrently; a _key
// path cannot land on the wrong span.
function spanPath(blockKey: string, child: { _key?: string }, index: number): string {
  return child._key
    ? `body[_key=="${blockKey}"].children[_key=="${child._key}"].text`
    : `body[_key=="${blockKey}"].children[${index}].text`;
}

// Locate the original text in the live document and compute the exact patch.
// Verbatim match only. Formatted blocks are rebuilt with marks preserved.
export async function planPatch(opts: {
  postId: string;
  fieldKind: string | null;
  blockKey: string | null;
  original: string;
  replacement: string;
  scope?: string | null;
}): Promise<PatchPlan> {
  const { postId, fieldKind, blockKey, original, replacement, scope } = opts;
  if (!fieldKind) {
    return {
      error:
        "This finding predates field-level targeting and cannot be applied safely. Re-run the review for this article, then try again.",
    };
  }
  // Read the version that will actually be edited — the draft if one exists.
  // An unpublished article has no published document, and a draft that already
  // carries edits is the correct basis for the next patch.
  const { doc: raw } = await readEditableDoc(postId);
  const doc = raw as { title?: string; summary?: string; body?: PtNode[] } | null;
  if (!doc) {
    return {
      error:
        "Neither a draft nor a published version of this article exists in Sanity — it may have been deleted.",
    };
  }

  const splice = (base: string): string => {
    const i = base.indexOf(original);
    let end = i + original.length;
    if (/[.!?]$/.test(replacement) && /^[.!?]/.test(base.slice(end))) end += 1;
    return tidySeam(base.slice(0, i) + replacement + base.slice(end));
  };

  // Plain string fields — ONLY when the finding actually came from that field.
  if (fieldKind === "title" || fieldKind === "summary") {
    const val = doc[fieldKind];
    if (typeof val !== "string" || !val.includes(original)) {
      return { error: `The flagged text is no longer present verbatim in the ${fieldKind}. Re-run the review for this article.` };
    }
    return { path: fieldKind, newValue: splice(val) };
  }
  if (fieldKind === "slug") {
    return { error: "Changing a slug would break the live URL — do this by hand." };
  }
  if (fieldKind === "linkHref") {
    return {
      error:
        "This finding is on a link URL. Rewriting a URL automatically would break the link — review and change it by hand in the Studio.",
    };
  }
  if (!blockKey) {
    return { error: "This finding has no block reference and cannot be applied safely. Re-run the review for this article." };
  }

  // Portable-text blocks. A quote inside one clean span gets a minimal
  // single-path patch; anything touching formatting is rebuilt span-by-span
  // with marks preserved (and any genuinely lost link reported, not dropped
  // silently).
  for (const node of doc.body ?? []) {
    if (!node || !node._key) continue;
    if (node._key !== blockKey) continue; // target exactly the recorded block
    if (node._type === "block" && Array.isArray(node.children)) {
      const block = node as PtBlockNode;
      const full = blockText(block);

      // A paragraph-scope rewrite replaces the WHOLE block — splicing it at the
      // quote's position would nest the new paragraph inside the old one.
      if (scope === "paragraph") {
        return rebuildToSets(block, 0, full.length, tidySeam(replacement), node._key);
      }

      const start = full.indexOf(original);
      if (start === -1) continue;
      let stop = start + original.length;
      // Avoid doubled punctuation at the seam.
      if (/[.!?]$/.test(replacement) && /^[.!?]/.test(full.slice(stop))) stop += 1;

      const solo = soloSpanFor(block, start, stop);
      if (solo) {
        const t = solo.child.text ?? "";
        return {
          path: spanPath(node._key, solo.child, solo.index),
          newValue: tidySeam(t.slice(0, solo.local) + replacement + t.slice(solo.local + (stop - start))),
        };
      }
      // Crosses a link or bold boundary: rebuild the block.
      return rebuildToSets(block, start, stop, replacement, node._key);
    }
    if (node._type === "rawHtml" && typeof node.html === "string") {
      try {
        const r = editHtmlText(node.html, original, replacement);
        if (r.matches > 1) {
          return { error: `The text appears ${r.matches}× in that table — ambiguous, edit by hand.` };
        }
        return { path: `body[_key=="${node._key}"].html`, newValue: r.html };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "table edit failed" };
      }
    }
  }
  return {
    error: `Could not find the original text verbatim in block ${blockKey}. The article may have been edited since the review ran — re-run the review for this article.`,
  };
}

/**
 * Repair punctuation left stranded where text was spliced out or replaced.
 *
 * Removing a mid-sentence clause such as ", uses device-level capture, keeps
 * notes private by default," leaves ", , and builds…". Collapsing only spaces
 * and terminal full stops is not enough — commas and semicolons strand too.
 */
function tidySeam(s: string): string {
  return s
    .replace(/ {2,}/g, " ")
    // ", ," / ",," / "; ," and similar runs -> a single separator
    .replace(/\s*([,;])\s*(?=[,;])/g, "")
    // " ," -> "," and " ." -> "."
    .replace(/\s+([,;.!?])/g, "$1")
    // ",." -> "."   (clause removed just before a sentence end)
    .replace(/,\s*([.!?])/g, "$1")
    // a clause removed at the start of a sentence can leave ". , Foo"
    .replace(/([.!?])\s*,\s*/g, "$1 ")
    // duplicated sentence-ending punctuation
    .replace(/([.!?])\1+/g, "$1")
    .trim();
}

// Plan a deletion. Sentence scope removes the flagged text (and its trailing
// space) from the span; paragraph scope removes the whole block. Body blocks
// only — deleting a title, summary, slug or URL is never automatic.
export async function planDeletion(opts: {
  postId: string;
  fieldKind: string | null;
  blockKey: string | null;
  original: string;
  scope: string;
}): Promise<PatchPlan> {
  const { postId, fieldKind, blockKey, original, scope } = opts;
  if (fieldKind !== "block" && fieldKind !== "rawHtml") {
    return { error: `Deleting from the ${fieldKind ?? "unknown"} field is not automatic — do it by hand in the Studio.` };
  }
  if (!blockKey) return { error: "No block reference — cannot delete safely." };

  if (scope === "paragraph") {
    // Remove the whole block. Reversible: this is a draft.
    return { path: `body[_key=="${blockKey}"]`, unset: true };
  }

  const { doc: rawDoc } = await readEditableDoc(postId);
  const doc = rawDoc as { body?: PtNode[] } | null;
  const node = (doc?.body ?? []).find((b) => b._key === blockKey);
  if (!node) return { error: `Block ${blockKey} not found.` };

  if (node._type === "rawHtml" && typeof node.html === "string") {
    // Deletion from a table is a replacement with nothing; the tag-skeleton
    // guard proves the table structure survived.
    try {
      const r = editHtmlText(node.html, original, "");
      if (r.matches > 1) {
        return { error: `The text appears ${r.matches}× in that table — ambiguous, edit by hand.` };
      }
      return { path: `body[_key=="${blockKey}"].html`, newValue: r.html };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "table delete failed" };
    }
  }

  const block = node as PtBlockNode;
  const full = blockText(block);
  const start = full.indexOf(original);
  if (start === -1) return { error: "The flagged text is no longer present verbatim — re-run the review for this article." };
  let stop = start + original.length;
  // Swallow one trailing space so the cut does not leave a double gap.
  if (full[stop] === " " && (start === 0 || full[start - 1] === " ")) stop += 1;

  const solo = soloSpanFor(block, start, stop);
  if (solo) {
    const t = solo.child.text ?? "";
    const local = solo.local;
    let cut = t.slice(0, local) + t.slice(local + (stop - start));
    cut = tidySeam(cut);
    if (local === 0) cut = cut.replace(/^\s+/, "");
    return { path: spanPath(blockKey, solo.child, solo.index), newValue: cut };
  }
  // The passage crosses a link or bold boundary: rebuild the block without it.
  return rebuildToSets(block, start, stop, "", blockKey);
}

interface PtNode {
  _key?: string;
  _type?: string;
  html?: string;
  children?: { _key?: string; _type?: string; text?: string; marks?: string[] }[];
  markDefs?: { _key?: string; _type?: string; href?: string }[];
}
