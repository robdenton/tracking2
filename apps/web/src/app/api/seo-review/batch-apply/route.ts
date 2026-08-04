import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import {
  getFinding,
  recordDecision,
  markApplied,
  applyToDraft,
  SanityTokenMissing,
  SanityTokenInvalid,
} from "@/lib/seo-review";
import { planPatch, planDeletion } from "@/lib/seo-apply";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/seo-review/batch-apply
//
// The auto-edit pipeline. Applies eligible findings to Sanity DRAFTS in
// batches, driven by scripts/batch-apply.mjs, which saves every response as a
// permanent change log in the repo.
//
// Body: { slugs?: string[], limit?: number, dryRun?: boolean }
//
// Eligibility is decided HERE, server-side, and is deliberately narrow:
//   - disposition red (any confidence), or amber with confidence high
//   - no human decision recorded, not already applied
//   - a rewrite or deletion remedy exists
// Everything else stays in the human queue untouched.
//
// Every application records decision='accept'/'accept-delete' with
// decided_by='auto-batch', so machine edits are always distinguishable from
// human ones and can be filtered, audited or reverted as a class.
//
// Never publishes. Drafts only, like every other write in this system.

const BATCH_CAP = 25; // stay well inside the function timeout

interface BatchChange {
  findingId: string;
  slug: string;
  title: string;
  liveUrl: string;
  studioUrl: string;
  fieldLabel: string;
  category: string;
  disposition: string;
  confidence: string;
  action: "rewrite" | "delete" | "skipped" | "error";
  scope: string | null;
  original: string;
  replacement: string | null;
  path: string | null;
  warning: string | null;
  appliedAt: string | null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { slugs?: string[]; limit?: number; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const limit = Math.min(Math.max(1, body.limit ?? BATCH_CAP), BATCH_CAP);
  const dryRun = Boolean(body.dryRun);
  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s) => typeof s === "string") : null;

  // Eligible, oldest article first so a run walks the corpus in a stable order.
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string }[]
  >`
    SELECT id, slug, title
    FROM seo_review_findings
    WHERE decision IS NULL
      AND applied_to_draft = false
      AND decided_by IS DISTINCT FROM 'auto-skip'
      AND (
        disposition = 'red'
        OR (disposition = 'amber' AND confidence = 'high')
      )
      AND (
        (proposed_text IS NOT NULL AND proposed_text <> '')
        OR (deletion_scope IS NOT NULL AND deletion_scope NOT IN ('none','not-advisable'))
      )
      AND (${slugs}::text[] IS NULL OR slug = ANY(${slugs}::text[]))
    ORDER BY slug, id
    LIMIT ${limit}`;

  const changes: BatchChange[] = [];

  for (const row of rows) {
    const f = await getFinding(row.id);
    if (!f) continue;

    const base: Omit<BatchChange, "action" | "scope" | "original" | "replacement" | "path" | "warning" | "appliedAt"> = {
      findingId: f.id,
      slug: f.slug,
      title: row.title,
      liveUrl: `https://www.granola.ai/blog/${f.slug}`,
      studioUrl: `https://www.granola.ai/studio/structure/seoPosts;${f.post_id}`,
      fieldLabel: f.field_label,
      category: f.category ?? "disclosure",
      disposition: f.disposition,
      confidence: f.confidence ?? "unknown",
    };

    // Rewrite is the default remedy (the human reviewer chose rewrite 64% of
    // the time); deletion only when no rewrite was proposed.
    const hasRewrite = Boolean(f.proposed_text && f.proposed_text.trim());
    const decision = hasRewrite ? "accept" : "accept-delete";

    try {
      const plan = hasRewrite
        ? await planPatch({
            postId: f.post_id,
            fieldKind: f.field_kind,
            blockKey: f.block_key,
            original: f.original_text,
            replacement: f.proposed_text as string,
            scope: f.rewrite_scope,
          })
        : await planDeletion({
            postId: f.post_id,
            fieldKind: f.field_kind,
            blockKey: f.block_key,
            original: f.original_text,
            scope: f.deletion_scope as string,
          });

      if ("error" in plan) {
        // Without a persistent marker the same rows head the eligibility query
        // forever and the driver loops on them — measured at 9,400 rounds
        // before this guard existed. decided_by carries the marker; decision
        // stays NULL so the row remains in the human review queue.
        if (!dryRun) {
          await prisma.$executeRaw`
            UPDATE seo_review_findings
            SET decided_by = 'auto-skip',
                note = COALESCE(note, ${"[auto-skip] " + plan.error})
            WHERE id = ${f.id}`;
        }
        changes.push({
          ...base, action: "skipped",
          scope: hasRewrite ? f.rewrite_scope : f.deletion_scope,
          original: f.original_text, replacement: null, path: null,
          warning: plan.error, appliedAt: null,
        });
        continue;
      }

      const primaryPath = "path" in plan ? plan.path : Object.keys(plan.sets)[0];
      if (!dryRun) {
        await recordDecision({ id: f.id, decision, note: null, finalText: null, decidedBy: "auto-batch" });
        await applyToDraft(
          "path" in plan
            ? { postId: f.post_id, path: plan.path, newValue: plan.newValue, unset: plan.unset }
            : { postId: f.post_id, sets: plan.sets },
        );
        await markApplied(f.id, primaryPath);
      }
      changes.push({
        ...base,
        action: hasRewrite ? "rewrite" : "delete",
        scope: hasRewrite ? f.rewrite_scope : f.deletion_scope,
        original: f.original_text,
        replacement: hasRewrite ? (f.proposed_text as string) : null,
        path: primaryPath,
        warning: "warning" in plan ? (plan.warning ?? null) : null,
        appliedAt: dryRun ? null : new Date().toISOString(),
      });
    } catch (e) {
      const msg =
        e instanceof SanityTokenMissing || e instanceof SanityTokenInvalid
          ? e.message
          : e instanceof Error
            ? e.message
            : "apply failed";
      changes.push({
        ...base, action: "error",
        scope: hasRewrite ? f.rewrite_scope : f.deletion_scope,
        original: f.original_text, replacement: null, path: null,
        warning: msg, appliedAt: null,
      });
      // A token failure will fail every subsequent row identically — stop.
      if (e instanceof SanityTokenMissing || e instanceof SanityTokenInvalid) break;
    }
  }

  const remaining = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM seo_review_findings
    WHERE decision IS NULL AND applied_to_draft = false
      AND decided_by IS DISTINCT FROM 'auto-skip'
      AND (disposition = 'red' OR (disposition = 'amber' AND confidence = 'high'))
      AND ((proposed_text IS NOT NULL AND proposed_text <> '')
        OR (deletion_scope IS NOT NULL AND deletion_scope NOT IN ('none','not-advisable')))`;

  return NextResponse.json({
    dryRun,
    processed: changes.length,
    applied: changes.filter((c) => c.action === "rewrite" || c.action === "delete").length,
    skipped: changes.filter((c) => c.action === "skipped").length,
    errors: changes.filter((c) => c.action === "error").length,
    remainingEligible: Number(remaining[0]?.n ?? 0),
    changes,
  });
}
