import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getFinding,
  getFindingsForSlug,
  recordDecision,
  markApplied,
  applyToDraft,
  SanityTokenMissing,
  SanityTokenInvalid,
} from "@/lib/seo-review";

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
  if (decision !== null && !["accept", "dismiss", "discard"].includes(decision)) {
    return NextResponse.json(
      { error: "decision must be accept, dismiss, discard or null" },
      { status: 400 },
    );
  }

  const finding = await getFinding(id);
  if (!finding) return NextResponse.json({ error: "finding not found" }, { status: 404 });

  await recordDecision({ id, decision, note, finalText, decidedBy: who });

  // Dismiss / undo: record only. Note that undoing an accept does NOT revert a
  // draft that was already written — say so explicitly rather than implying it.
  if (decision !== "accept") {
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

  // Accept — apply to the draft.
  if (finding.applied_to_draft) {
    return NextResponse.json({ ok: true, decision, appliedToDraft: true, alreadyApplied: true });
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
  });
  if ("error" in plan) {
    return NextResponse.json(
      { ok: true, decision, appliedToDraft: false, warning: plan.error },
      { status: 200 },
    );
  }

  try {
    await applyToDraft({ postId: finding.post_id, path: plan.path, newValue: plan.newValue });
    await markApplied(id, plan.path);
    return NextResponse.json({
      ok: true,
      decision,
      appliedToDraft: true,
      path: plan.path,
      draftId: `drafts.${finding.post_id}`,
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

// Locate the original text in the live document and compute the exact patch.
// Mirrors review/draft.mjs: verbatim match only, single span only.
async function planPatch(opts: {
  postId: string;
  fieldKind: string | null;
  blockKey: string | null;
  original: string;
  replacement: string;
}): Promise<{ path: string; newValue: string } | { error: string }> {
  const { postId, fieldKind, blockKey, original, replacement } = opts;
  if (!fieldKind) {
    return {
      error:
        "This finding predates field-level targeting and cannot be applied safely. Re-run the review for this article, then try again.",
    };
  }
  const res = await fetch(
    `https://oy7f1h9b.api.sanity.io/v2021-06-07/data/query/production`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `*[_id == $id][0]`, params: { id: postId } }),
      cache: "no-store",
    },
  );
  if (!res.ok) return { error: `Could not read document: ${res.status}` };
  const doc = (await res.json()).result as
    | { title?: string; summary?: string; body?: PtNode[] }
    | null;
  if (!doc) return { error: "Document not found" };

  const splice = (base: string): string => {
    const i = base.indexOf(original);
    let end = i + original.length;
    if (/[.!?]$/.test(replacement) && /^[.!?]/.test(base.slice(end))) end += 1;
    return (base.slice(0, i) + replacement + base.slice(end)).replace(/ {2,}/g, " ");
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

  // Portable-text blocks: the quote must sit inside exactly one span, or we
  // refuse — splicing across spans would corrupt marks and link annotations.
  for (const node of doc.body ?? []) {
    if (!node || !node._key) continue;
    if (node._key !== blockKey) continue; // target exactly the recorded block
    if (node._type === "block" && Array.isArray(node.children)) {
      const full = node.children.map((c) => c.text ?? "").join("");
      const start = full.indexOf(original);
      if (start === -1) continue;
      const stop = start + original.length;
      let offset = 0;
      for (let i = 0; i < node.children.length; i++) {
        const t = node.children[i].text ?? "";
        if (start >= offset && stop <= offset + t.length) {
          return {
            path: `body[_key=="${node._key}"].children[${i}].text`,
            newValue: splice(t),
          };
        }
        offset += t.length;
      }
      return {
        error:
          "The flagged text spans multiple styled spans (bold or a link). Not applied automatically, to avoid corrupting the link markup — edit this one by hand in the Studio.",
      };
    }
    if (node._type === "rawHtml" && typeof node.html === "string") {
      const count = node.html.split(original).length - 1;
      if (count === 1) {
        return { path: `body[_key=="${node._key}"].html`, newValue: splice(node.html) };
      }
      if (count > 1) {
        return { error: `The text appears ${count}× in that table — ambiguous, edit by hand.` };
      }
    }
  }
  return {
    error: `Could not find the original text verbatim in block ${blockKey}. The article may have been edited since the review ran — re-run the review for this article.`,
  };
}

interface PtNode {
  _key?: string;
  _type?: string;
  html?: string;
  children?: { text?: string }[];
}
