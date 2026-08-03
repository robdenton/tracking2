import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { tableExists } from "@/lib/seo-review";

// Is the token a single, header-safe value? Reports shape only — never the value.
function tokenUsable(): string {
  const raw = process.env.SANITY_WRITE_TOKEN;
  if (!raw) return "missing";
  const t = raw.trim();
  if (!t) return "empty";
  if (/\s/.test(t)) return "INVALID: contains spaces or line breaks (pasted more than once?)";
  if (!/^[\x21-\x7e]+$/.test(t)) return "INVALID: contains non-header-safe characters";
  return `ok (${t.length} chars)`;
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET  — health check: does the decision-log table exist yet?
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return unauthorizedResponse();
  try {
    const exists = await tableExists();
    const count = exists
      ? await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM seo_review_findings`
      : null;
    return NextResponse.json({
      tableExists: exists,
      rows: count ? Number(count[0].n) : 0,
      sanityWriteTokenConfigured: Boolean(process.env.SANITY_WRITE_TOKEN),
      sanityWriteTokenUsable: tokenUsable(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "check failed" },
      { status: 500 },
    );
  }
}

interface IncomingFinding {
  id: string;
  postId: string;
  slug: string;
  title: string;
  segmentId: string;
  fieldLabel: string;
  layer: string;
  term?: string | null;
  disposition: string;
  confidence?: string | null;
  originalText: string;
  proposedText?: string | null;
  readerTakeaway?: string | null;
  rulesHash: string;
  model: string;
  fieldKind?: string | null;
  blockKey?: string | null;
}

// POST — upsert findings produced by the review runner.
// Existing decisions are preserved: only the finding fields are refreshed, so
// re-running a review never silently discards a sign-off.
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) return unauthorizedResponse();

  let body: { findings?: IncomingFinding[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const findings = body.findings ?? [];
  if (findings.length === 0) return NextResponse.json({ error: "no findings" }, { status: 400 });

  let inserted = 0;
  for (const f of findings) {
    await prisma.$executeRaw`
      INSERT INTO seo_review_findings (
        id, post_id, slug, title, segment_id, field_label, layer, term,
        disposition, confidence, original_text, proposed_text, reader_takeaway,
        rules_hash, model, applied_to_draft, field_kind, block_key, created_at, updated_at
      ) VALUES (
        ${f.id}, ${f.postId}, ${f.slug}, ${f.title}, ${f.segmentId}, ${f.fieldLabel},
        ${f.layer}, ${f.term ?? null}, ${f.disposition}, ${f.confidence ?? null},
        ${f.originalText}, ${f.proposedText ?? null}, ${f.readerTakeaway ?? null},
        ${f.rulesHash}, ${f.model}, false, ${f.fieldKind ?? null}, ${f.blockKey ?? null}, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        disposition = EXCLUDED.disposition,
        proposed_text = EXCLUDED.proposed_text,
        reader_takeaway = EXCLUDED.reader_takeaway,
        confidence = EXCLUDED.confidence,
        rules_hash = EXCLUDED.rules_hash,
        model = EXCLUDED.model,
        field_kind = EXCLUDED.field_kind,
        block_key = EXCLUDED.block_key,
        updated_at = NOW()`;
    inserted++;
  }

  // Prune orphans: rows for these articles that are no longer produced by the
  // review (e.g. the finding changed, so its content-addressed id changed).
  // NEVER prunes a row that carries a decision or was applied to a draft —
  // a sign-off or a real draft edit must never be deleted by a re-sync.
  let pruned = 0;
  const slugs = [...new Set(findings.map((f) => f.slug))];
  const keepIds = findings.map((f) => f.id);
  if (slugs.length > 0 && keepIds.length > 0) {
    pruned = await prisma.$executeRaw`
      DELETE FROM seo_review_findings
      WHERE slug = ANY(${slugs}::text[])
        AND id <> ALL(${keepIds}::text[])
        AND decision IS NULL
        AND applied_to_draft = false`;
  }

  return NextResponse.json({ ok: true, upserted: inserted, pruned });
}
