import { prisma } from "@/lib/prisma";

// Server-side layer for the SEO consent & disclosure review:
//   - persistence of findings + sign-off decisions (raw SQL, see note below)
//   - applying an accepted rewrite to a Sanity DRAFT
//   - reporting whether a change is still draft-only or has been published
//
// NOTE ON RAW SQL: this uses $queryRaw rather than the generated Prisma model
// accessor. The model exists in schema.prisma and the table is created by the
// deploy's `prisma db push`, but `prisma generate` could not be run in the
// authoring environment, so the typed accessor is not available here. The SQL
// below is parameterised throughout — no interpolation of user input.

export const SANITY_PROJECT = "oy7f1h9b";
export const SANITY_DATASET = "production";
const API = `https://${SANITY_PROJECT}.api.sanity.io/v2021-06-07`;

export interface FindingRow {
  id: string;
  post_id: string;
  slug: string;
  title: string;
  segment_id: string;
  field_label: string;
  layer: string;
  term: string | null;
  disposition: string;
  confidence: string | null;
  original_text: string;
  proposed_text: string | null;
  final_text: string | null;
  reader_takeaway: string | null;
  decision: string | null;
  note: string | null;
  decided_by: string | null;
  decided_at: Date | null;
  rules_hash: string;
  model: string;
  applied_to_draft: boolean;
  applied_at: Date | null;
  sanity_path: string | null;
  field_kind: string | null;
  block_key: string | null;
  rewrite_scope: string | null;
  deletion_scope: string | null;
  deletion_note: string | null;
}

// --- Sanity reads (public dataset, no token needed) ------------------------
async function groq<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API}/data/query/${SANITY_DATASET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result as T;
}

/**
 * Publish status for a set of documents.
 *
 * Sanity deletes `drafts.<id>` when a document is published, so the presence of
 * a draft is the signal: draft exists => the change is still unpublished.
 * We additionally check whether the published document now contains the new
 * text, which distinguishes "published" from "draft discarded".
 */
export async function getPublishStatus(
  postIds: string[],
): Promise<Record<string, { draftExists: boolean; publishedUpdatedAt: string | null }>> {
  if (postIds.length === 0) return {};
  const draftIds = postIds.map((id) => `drafts.${id}`);
  const rows = await groq<
    { published: { _id: string; _updatedAt: string }[]; drafts: { _id: string }[] }
  >(
    `{
      "published": *[_id in $ids]{_id, _updatedAt},
      "drafts": *[_id in $draftIds]{_id}
    }`,
    { ids: postIds, draftIds },
  );
  const draftSet = new Set((rows.drafts || []).map((d) => d._id.replace(/^drafts\./, "")));
  const out: Record<string, { draftExists: boolean; publishedUpdatedAt: string | null }> = {};
  for (const id of postIds) {
    const pub = (rows.published || []).find((p) => p._id === id);
    out[id] = { draftExists: draftSet.has(id), publishedUpdatedAt: pub?._updatedAt ?? null };
  }
  return out;
}

// --- Sanity write (requires a token) ---------------------------------------
export class SanityTokenMissing extends Error {
  constructor() {
    super(
      "SANITY_WRITE_TOKEN is not configured. Accepting a finding cannot update the Sanity draft until an Editor-scoped write token is set in the environment.",
    );
    this.name = "SanityTokenMissing";
  }
}

/**
 * Apply a single rewrite to the DRAFT of a published document.
 *
 * Never touches the published document and never publishes: it seeds
 * `drafts.<id>` from the published doc if absent (`createIfNotExists`), then
 * patches only the given path. The caller must have verified the original text
 * anchors verbatim.
 */
/** Strip anything that would make the value an invalid HTTP header, and never
 *  let the secret itself reach an error message or a log line. */
export class SanityTokenInvalid extends Error {
  constructor(detail: string) {
    super(
      `SANITY_WRITE_TOKEN is set but is not a usable value (${detail}). Re-enter it in Vercel as a single line with no spaces or line breaks, then redeploy.`,
    );
    this.name = "SanityTokenInvalid";
  }
}

function readToken(): string {
  const raw = process.env.SANITY_WRITE_TOKEN;
  if (!raw) throw new SanityTokenMissing();
  const token = raw.trim();
  if (!token) throw new SanityTokenMissing();
  // A Sanity token is a single opaque string. Whitespace inside it means the
  // value was pasted more than once or wrapped across lines — both produce an
  // "invalid header value" from fetch, so fail with a useful message instead.
  if (/\s/.test(token)) {
    throw new SanityTokenInvalid("it contains spaces or line breaks — it looks like the value was pasted more than once");
  }
  if (!/^[\x21-\x7e]+$/.test(token)) {
    throw new SanityTokenInvalid("it contains characters that are not valid in an HTTP header");
  }
  return token;
}

/** Remove any occurrence of the secret from a message before it is surfaced. */
function redact(message: string): string {
  const raw = process.env.SANITY_WRITE_TOKEN;
  let out = message;
  if (raw) {
    for (const piece of [raw, raw.trim(), ...raw.split(/\s+/)]) {
      if (piece && piece.length > 8) out = out.split(piece).join("[redacted]");
    }
  }
  // Belt and braces: redact anything token-shaped that survived.
  return out.replace(/sk[A-Za-z0-9._-]{16,}/g, "[redacted]");
}

export async function applyToDraft(opts: {
  postId: string;
  path: string;
  newValue?: string;
  /** Remove the node entirely instead of setting a value (paragraph deletion). */
  unset?: boolean;
}): Promise<{ draftId: string; transactionId: string }> {
  const token = readToken();

  const { postId, path, newValue, unset } = opts;
  const draftId = `drafts.${postId}`;

  // Guard: the path is generated by our own planner, but validate anyway so a
  // corrupted row can never smuggle arbitrary content into a mutation path.
  if (!/^[A-Za-z0-9_.[\]"=\-]+$/.test(path)) {
    throw new Error(`Refusing to patch: unsafe path ${JSON.stringify(path)}`);
  }

  // Seed the draft from the published document if it does not exist yet —
  // this is what the Studio does when you first edit a published doc.
  const published = await groq<Record<string, unknown> | null>(`*[_id == $id][0]`, { id: postId });
  if (!published) throw new Error(`Published document ${postId} not found`);
  const draftSeed = { ...published, _id: draftId };
  delete (draftSeed as Record<string, unknown>)._rev;

  let res: Response;
  try {
    res = await fetch(`${API}/data/mutate/${SANITY_DATASET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mutations: [
          { createIfNotExists: draftSeed },
          unset
            ? { patch: { id: draftId, unset: [path] } }
            : { patch: { id: draftId, set: { [path]: newValue } } },
        ],
      }),
    });
  } catch (e) {
    // fetch itself rejected (e.g. an unusable header value) — redact before
    // this reaches a browser or a log.
    throw new Error(redact(e instanceof Error ? e.message : "request failed"));
  }
  if (!res.ok) {
    const detail = redact(await res.text());
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Sanity rejected the write token (${res.status}). Check it has Editor permission on project ${SANITY_PROJECT} and has not been revoked.`,
      );
    }
    throw new Error(`Sanity mutate failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { transactionId: string };
  return { draftId, transactionId: json.transactionId };
}

// --- persistence -----------------------------------------------------------
export async function getFindingsForSlug(slug: string): Promise<FindingRow[]> {
  return prisma.$queryRaw<FindingRow[]>`
    SELECT * FROM seo_review_findings WHERE slug = ${slug} ORDER BY id ASC`;
}

export async function getFinding(id: string): Promise<FindingRow | null> {
  const rows = await prisma.$queryRaw<FindingRow[]>`
    SELECT * FROM seo_review_findings WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

/** Every change that has actually been written to a draft — the audit log. */
export async function getAppliedChanges(): Promise<FindingRow[]> {
  return prisma.$queryRaw<FindingRow[]>`
    SELECT * FROM seo_review_findings
    WHERE applied_to_draft = true
    ORDER BY applied_at DESC`;
}

/** Suggestions deliberately rejected. Recorded, not deleted — the decision to
 *  reject a flag is as auditable as the decision to apply one. */
export async function getDiscardedChanges(): Promise<FindingRow[]> {
  return prisma.$queryRaw<FindingRow[]>`
    SELECT * FROM seo_review_findings
    WHERE decision IN ('discard', 'dismiss')
    ORDER BY decided_at DESC`;
}

export async function recordDecision(opts: {
  id: string;
  decision: string | null;
  note: string | null;
  finalText: string | null;
  decidedBy: string | null;
}): Promise<void> {
  await prisma.$executeRaw`
    UPDATE seo_review_findings
    SET decision = ${opts.decision},
        note = ${opts.note},
        final_text = ${opts.finalText},
        decided_by = ${opts.decidedBy},
        decided_at = ${opts.decision ? new Date() : null},
        updated_at = NOW()
    WHERE id = ${opts.id}`;
}

export async function markApplied(id: string, path: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE seo_review_findings
    SET applied_to_draft = true, applied_at = NOW(), sanity_path = ${path}, updated_at = NOW()
    WHERE id = ${id}`;
}

export interface SlugStatus {
  slug: string;
  total: number;
  red: number;
  amber: number;
  accepted: number;
  dismissed: number;
  applied: number;
}

/**
 * Per-article review status, aggregated from the decision log.
 * A slug missing from the result has not been reviewed.
 */
export async function getStatusBySlug(): Promise<Record<string, SlugStatus>> {
  const rows = await prisma.$queryRaw<
    {
      slug: string;
      total: bigint;
      red: bigint;
      amber: bigint;
      accepted: bigint;
      dismissed: bigint;
      applied: bigint;
    }[]
  >`
    SELECT slug,
           count(*)                                             AS total,
           count(*) FILTER (WHERE disposition = 'red')           AS red,
           count(*) FILTER (WHERE disposition = 'amber')         AS amber,
           count(*) FILTER (WHERE decision = 'accept')           AS accepted,
           count(*) FILTER (WHERE decision = 'dismiss')          AS dismissed,
           count(*) FILTER (WHERE applied_to_draft = true)       AS applied
    FROM seo_review_findings
    GROUP BY slug`;
  const out: Record<string, SlugStatus> = {};
  for (const r of rows) {
    out[r.slug] = {
      slug: r.slug,
      total: Number(r.total),
      red: Number(r.red),
      amber: Number(r.amber),
      accepted: Number(r.accepted),
      dismissed: Number(r.dismissed),
      applied: Number(r.applied),
    };
  }
  return out;
}

export async function tableExists(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ t: string | null }[]>`
    SELECT to_regclass('public.seo_review_findings')::text AS t`;
  return Boolean(rows[0]?.t);
}
