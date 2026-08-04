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
import { planPatch, planDeletion } from "@/lib/seo-apply";

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
