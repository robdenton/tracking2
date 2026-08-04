import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getFinding,
  getFindingsForSlug,
  recordDecision,
  markApplied,
  applyToDraft,
  readEditableDoc,
  SanityTokenMissing,
  SanityTokenInvalid,
} from "@/lib/seo-review";
import {
  rebuildChildren,
  editHtmlText,
  blockText,
  type PtBlockNode,
} from "@/lib/pt-edit";

export const dynamic = "force-dynamic";

// GET /api/seo-review/decisions?slug=<slug>
// Returns every finding for an article with its current decision, so the review
// page can restore state on load from the server rather than localStorage.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const rows = await getFindingsForSlug(slug);
    return NextResponse.json({
      findings: rows.map((r) => ({
        id: r.id,
        decision: r.decision,
        note: r.note,
        finalText: r.final_text,
        appliedToDraft: r.applied_to_draft,
        appliedAt: r.applied_at,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "query failed" },
      { status: 500 },
    );
  }
}

// POST /api/seo-review/decisions
// Body: { id, decision: "accept"|"dismiss"|null, note?, finalText? }
//
// On "accept" the proposed rewrite is written to the Sanity DRAFT immediately
// and the row is marked applied — that is what makes the change log real.
// The published document is never modified and nothing is ever published.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const who = session.user?.email ?? session.user?.name ?? "unknown";

  let body: {
    id?: string;
    decision?: string | null;
    note?: string | null;
    finalText?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { id, decision = null, note = null, finalText = null } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (decision !== null && !["accept", "accept-delete", "dismiss", "discard"].includes(decision)) {
    return NextResponse.json(
      { error: "decision must be accept, accept-delete, dismiss, discard or null" },
      { status: 400 },
    );
  }

  const finding = await getFinding(id);
  if (!finding) return NextResponse.json({ error: "finding not found" }, { status: 404 });

  await recordDecision({ id, decision, note, finalText, decidedBy: who });

  const isApply = decision === "accept" || decision === "accept-delete";

  // Dismiss / discard / undo: record only. Note that undoing an accept does NOT revert a
  // draft that was already written — say so explicitly rather than implying it.
  if (!isApply) {
    return NextResponse.json({
      ok: true,
      decision,
      appliedToDraft: finding.applied_to_draft,
      // If it was already written to the draft, changing the decision here does
      // not undo that. Say so plainly rather than implying a revert happened.
      warning: finding.applied_to_draft
        ? "This was already written to the Sanity draft. Changing the decision here does not revert the draft — discard it in the Studio."
        : undefined,
    });
  }

  // Apply to the draft.
  if (finding.applied_to_draft) {
    return NextResponse.json({ ok: true, decision, appliedToDraft: true, alreadyApplied: true });
  }

  // Deletion path — remove the passage rather than reword it.
  if (decision === "accept-delete") {
    const scope = finding.deletion_scope;
    if (!scope || scope === "none" || scope === "not-advisable") {
      return NextResponse.json(
        { ok: true, decision, appliedToDraft: false, warning: "No deletion remedy was proposed for this finding." },
        { status: 200 },
      );
    }
    const plan = await planDeletion({
      postId: finding.post_id,
      fieldKind: finding.field_kind,
      blockKey: finding.block_key,
      original: finding.original_text,
      scope,
    });
    if ("error" in plan) {
      return NextResponse.json({ ok: true, decision, appliedToDraft: false, warning: plan.error }, { status: 200 });
    }
    try {
      const primaryPath = "path" in plan ? plan.path : Object.keys(plan.sets)[0];
      await applyToDraft(
        "path" in plan
          ? { postId: finding.post_id, path: plan.path, newValue: plan.newValue, unset: plan.unset }
          : { postId: finding.post_id, sets: plan.sets },
      );
      await markApplied(id, primaryPath);
      return NextResponse.json({
        ok: true, decision, appliedToDraft: true, deleted: true, scope,
        path: primaryPath, draftId: `drafts.${finding.post_id}`,
        warning: "warning" in plan ? plan.warning : undefined,
      });
    } catch (e) {
      if (e instanceof SanityTokenMissing || e instanceof SanityTokenInvalid) {
        return NextResponse.json({ ok: true, decision, appliedToDraft: false, warning: e.message }, { status: 200 });
      }
      return NextResponse.json(
        { ok: true, decision, appliedToDraft: false, warning: e instanceof Error ? e.message : "delete failed" },
        { status: 200 },
      );
    }
  }

  const replacement = finalText ?? finding.proposed_text;
  if (!replacement) {
    return NextResponse.json(
      { ok: true, decision, appliedToDraft: false, warning: "No proposed rewrite to apply." },
      { status: 200 },
    );
  }

  // Re-derive the patch server-side. We do NOT trust a client-supplied path.
  // Targeting uses the field/block recorded with the finding — searching all
  // fields would let a short quote (e.g. "compliance") match the title and
  // splice body copy into the headline.
  const plan = await planPatch({
    postId: finding.post_id,
    fieldKind: finding.field_kind,
    blockKey: finding.block_key,
    original: finding.original_text,
    replacement,
    scope: finding.rewrite_scope,
  });
  if ("error" in plan) {
    return NextResponse.json(
      { ok: true, decision, appliedToDraft: false, warning: plan.error },
      { status: 200 },
    );
  }

  try {
    const primaryPath = "path" in plan ? plan.path : Object.keys(plan.sets)[0];
    await applyToDraft(
      "path" in plan
        ? { postId: finding.post_id, path: plan.path, newValue: plan.newValue }
        : { postId: finding.post_id, sets: plan.sets },
    );
    await markApplied(id, primaryPath);
    return NextResponse.json({
      ok: true,
      decision,
      appliedToDraft: true,
      path: primaryPath,
      draftId: `drafts.${finding.post_id}`,
      warning: "warning" in plan ? plan.warning : undefined,
    });
  } catch (e) {
    if (e instanceof SanityTokenMissing || e instanceof SanityTokenInvalid) {
      return NextResponse.json(
        { ok: true, decision, appliedToDraft: false, warning: e.message },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { ok: true, decision, appliedToDraft: false, warning: e instanceof Error ? e.message : "apply failed" },
      { status: 200 },
    );
  }
}

// A plan is either a single-path patch, a multi-path set (used when a
// formatted block's children array must be rebuilt — children and markDefs
// change together, atomically), or a refusal.
type PatchPlan =
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
async function planPatch(opts: {
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
async function planDeletion(opts: {
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
