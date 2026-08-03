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
// NOTE: every query lists columns explicitly. `SELECT *` changes its result
// type whenever a column is added, which invalidates cached prepared-statement
// plans on pooled connections and fails with
// `0A000: cached plan must not change result type` until the pool recycles.
export async function getFindingsForSlug(slug: string): Promise<FindingRow[]> {
  return prisma.$queryRaw<FindingRow[]>`
    SELECT id, post_id, slug, title, segment_id, field_label, layer, term,
           disposition, confidence, original_text, proposed_text, final_text,
           reader_takeaway, decision, note, decided_by, decided_at,
           rules_hash, model, applied_to_draft, applied_at, sanity_path,
           field_kind, block_key, rewrite_scope, deletion_scope, deletion_note
    FROM seo_review_findings WHERE slug = ${slug} ORDER BY id ASC`;
}

export async function getFinding(id: string): Promise<FindingRow | null> {
  const rows = await prisma.$queryRaw<FindingRow[]>`
    SELECT id, post_id, slug, title, segment_id, field_label, layer, term,
           disposition, confidence, original_text, proposed_text, final_text,
           reader_takeaway, decision, note, decided_by, decided_at,
           rules_hash, model, applied_to_draft, applied_at, sanity_path,
           field_kind, block_key, rewrite_scope, deletion_scope, deletion_note
    FROM seo_review_findings WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

/** Every change that has actually been written to a draft — the audit log. */
export async function getAppliedChanges(): Promise<FindingRow[]> {
  return prisma.$queryRaw<FindingRow[]>`
    SELECT id, post_id, slug, title, segment_id, field_label, layer, term,
           disposition, confidence, original_text, proposed_text, final_text,
           reader_takeaway, decision, note, decided_by, decided_at,
           rules_hash, model, applied_to_draft, applied_at, sanity_path,
           field_kind, block_key, rewrite_scope, deletion_scope, deletion_note
    FROM seo_review_findings
    WHERE applied_to_draft = true
    ORDER BY applied_at DESC`;
}

/** Suggestions deliberately rejected. Recorded, not deleted — the decision to
 *  reject a flag is as auditable as the decision to apply one. */
export async function getDiscardedChanges(): Promise<FindingRow[]> {
  return prisma.$queryRaw<FindingRow[]>`
    SELECT id, post_id, slug, title, segment_id, field_label, layer, term,
           disposition, confidence, original_text, proposed_text, final_text,
           reader_takeaway, decision, note, decided_by, decided_at,
           rules_hash, model, applied_to_draft, applied_at, sanity_path,
           field_kind, block_key, rewrite_scope, deletion_scope, deletion_note
    FROM seo_review_findings
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
  /** Findings that actually need a call — red + amber. */
  needing: number;
  /** Of those, how many have any decision recorded. */
  decided: number;
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
      needing: bigint;
      decided: bigint;
      accepted: bigint;
      dismissed: bigint;
      applied: bigint;
    }[]
  >`
    SELECT slug,
           count(*)                                       AS total,
           count(*) FILTER (WHERE disposition = 'red')     AS red,
           count(*) FILTER (WHERE disposition = 'amber')   AS amber,
           count(*) FILTER (WHERE disposition IN ('red','amber'))                            AS needing,
           count(*) FILTER (WHERE disposition IN ('red','amber') AND decision IS NOT NULL)    AS decided,
           -- 'accept' is Rewrite and 'accept-delete' is Delete. Counting only
           -- the former reported 0 accepted on articles reviewed by deleting,
           -- which read as "not reviewed yet".
           count(*) FILTER (WHERE decision IN ('accept','accept-delete'))                     AS accepted,
           count(*) FILTER (WHERE decision IN ('dismiss','discard'))                          AS dismissed,
           count(*) FILTER (WHERE applied_to_draft = true)                                    AS applied
    FROM seo_review_findings
    GROUP BY slug`;
  const out: Record<string, SlugStatus> = {};
  for (const r of rows) {
    out[r.slug] = {
      slug: r.slug,
      total: Number(r.total),
      red: Number(r.red),
      amber: Number(r.amber),
      needing: Number(r.needing),
      decided: Number(r.decided),
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

// --- Post-edit draft verification -----------------------------------------
// Automated splices leave artifacts: stranded punctuation where a clause was
// removed, a rewrite that restates its neighbour, a block emptied by deletion.
// Two such defects reached a live draft before this existed, so the check runs
// against the draft itself rather than trusting that the edits were clean.

export interface DraftIssue {
  kind: "punctuation" | "duplication" | "empty-block" | "fragment" | "length";
  where: string;
  detail: string;
  text: string;
}

export interface ManualAction {
  reason: string;
  disposition: string;
  decision: string;
  fieldLabel: string;
  text: string;
}

export interface DraftVerification {
  slug: string;
  postId: string;
  draftExists: boolean;
  publishedBlocks: number;
  draftBlocks: number;
  issues: DraftIssue[];
  manualActions: ManualAction[];
  checkedAt: string;
}

/** Read a document including drafts — needs the write token's read access. */
async function readDoc(id: string): Promise<Record<string, unknown> | null> {
  const token = process.env.SANITY_WRITE_TOKEN?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token && !/\s/.test(token)) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/data/query/${SANITY_DATASET}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: `*[_id == $id][0]`, params: { id } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sanity read failed: ${res.status}`);
  return (await res.json()).result ?? null;
}

interface PtBlock {
  _key?: string;
  _type?: string;
  html?: string;
  style?: string;
  children?: { text?: string }[];
}

const blockText = (b: PtBlock) =>
  b._type === "block" ? (b.children ?? []).map((c) => c.text ?? "").join("") : "";

const sentencesOf = (t: string) =>
  t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 12);

/**
 * Find the longest word-sequence that appears more than once in a string.
 *
 * Sentence-level comparison is not enough: splicing a paragraph in at a
 * sentence's position repeats a phrase MID-sentence, e.g.
 * "Download Granola … connect your calendar, and Download Granola … connect
 * your calendar, and run your next meeting". No whole sentence repeats there,
 * so a sentence-only check reports the paragraph as clean.
 */
function repeatedPhrase(text: string, minWords = 5): string | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < minWords * 2) return null;
  // Longest first, so the report names the biggest duplicated run.
  for (let n = Math.floor(words.length / 2); n >= minWords; n--) {
    const seen = new Map<string, number>();
    for (let i = 0; i + n <= words.length; i++) {
      const gram = words.slice(i, i + n).join(" ");
      const norm = gram.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      if (norm.length < 20) continue;
      const prev = seen.get(norm);
      // Only ADJACENT (or near-adjacent) repeats indicate splice damage.
      // Well-written prose repeats phrases deliberately — "The direct report
      // owns the agenda… When your direct report owns the agenda…" is rhetoric,
      // not a defect. Requiring the copies to sit next to each other is what
      // distinguishes damage from style.
      if (prev !== undefined && i >= prev + n && i - (prev + n) <= 3) return gram;
      if (prev === undefined) seen.set(norm, i);
    }
  }
  return null;
}

const PUNCT_CHECKS: { pattern: RegExp; detail: string }[] = [
  { pattern: /,\s*,/, detail: "stranded comma — text was removed between two commas" },
  { pattern: /\s+[,;]/, detail: "space before a comma or semicolon" },
  { pattern: /,\s*[.!?]/, detail: "comma immediately before a sentence end" },
  { pattern: /[.!?]{2,}/, detail: "duplicated sentence-ending punctuation" },
  { pattern: /\s{2,}/, detail: "double space" },
  // "e.g.," and "i.e.," are correct, so a bare /[.!?]\s*,/ is a false positive.
  // Genuine damage from a splice leaves a SPACE before the comma, and never
  // follows a known abbreviation.
  {
    pattern: /(?<!\b(?:e\.g|i\.e|etc|vs|viz|cf|al|Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|St|No|approx|Fig|Vol|Jr|Sr)\.)[.!?]\s+,/,
    detail: "comma immediately after a sentence end",
  },
  { pattern: /\(\s*\)|\[\s*\]/, detail: "empty brackets left behind" },
];

export async function verifyDraft(slug: string): Promise<DraftVerification> {
  const rows = await getFindingsForSlug(slug);
  if (rows.length === 0) throw new Error(`No findings recorded for "${slug}"`);
  const postId = rows[0].post_id;

  const [published, draft] = await Promise.all([
    readDoc(postId),
    readDoc(`drafts.${postId}`),
  ]);

  const issues: DraftIssue[] = [];
  const pubBlocks = (published?.body as PtBlock[] | undefined) ?? [];
  const draftBlocks = (draft?.body as PtBlock[] | undefined) ?? [];

  if (draft) {
    // Anything already true of the published article is not our damage. This is
    // the strongest guard against reporting the author's own style as a defect.
    const publishedText = [
      String(published?.title ?? ""),
      String(published?.summary ?? ""),
      ...pubBlocks.map((b) => blockText(b)),
    ].join("\n");
    const preExisting = (snippet: string) => {
      const norm = snippet.toLowerCase().replace(/\s+/g, " ").trim();
      return norm.length > 15 && publishedText.toLowerCase().replace(/\s+/g, " ").includes(norm);
    };

    const fields: { where: string; text: string }[] = [
      { where: "Title", text: String(draft.title ?? "") },
      { where: "Meta / summary", text: String(draft.summary ?? "") },
      ...draftBlocks
        .filter((b) => b._type === "block")
        .map((b, i) => ({
          where: `Block ${i + 1}${b.style && b.style !== "normal" ? ` (${b.style})` : ""}`,
          text: blockText(b),
        })),
    ];

    for (const f of fields) {
      if (!f.text) continue;
      for (const c of PUNCT_CHECKS) {
        const m = f.text.match(c.pattern);
        if (m) {
          const at = m.index ?? 0;
          issues.push({
            kind: "punctuation",
            where: f.where,
            detail: c.detail,
            text: f.text.slice(Math.max(0, at - 60), at + 80).trim(),
          });
        }
      }
      const seen = new Set<string>();
      for (const s of sentencesOf(f.text)) {
        const norm = s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
        if (norm.length > 12 && seen.has(norm) && !preExisting(s + " " + s)) {
          issues.push({
            kind: "duplication",
            where: f.where,
            detail: "sentence appears twice in the same field",
            text: s,
          });
        }
        seen.add(norm);
      }
      // Mid-sentence repeats, which whole-sentence comparison cannot see.
      const phrase = repeatedPhrase(f.text);
      if (phrase && !preExisting(phrase + " " + phrase)) {
        issues.push({
          kind: "duplication",
          where: f.where,
          detail: "a phrase is repeated within this field",
          text: phrase.length > 160 ? phrase.slice(0, 160) + "…" : phrase,
        });
      }
      if (f.where === "Meta / summary" && f.text.length > 0 && f.text.length < 50) {
        issues.push({
          kind: "length",
          where: f.where,
          detail: `summary is only ${f.text.length} characters`,
          text: f.text,
        });
      }
    }

    const pubByKey = new Map(pubBlocks.map((b) => [b._key, blockText(b)]));
    draftBlocks.forEach((b, i) => {
      if (b._type !== "block") return;
      const t = blockText(b);
      const was = pubByKey.get(b._key) ?? "";
      if (was && !t.trim()) {
        issues.push({
          kind: "empty-block",
          where: `Block ${i + 1}`,
          detail: "block is now empty — remove it in the Studio",
          text: was.slice(0, 120),
        });
      } else if (was && t.trim() && t.length < 25 && was.length > 80) {
        issues.push({
          kind: "fragment",
          where: `Block ${i + 1}`,
          detail: "block reduced to a fragment",
          text: t,
        });
      } else if (
        t.trim() && was.trim() &&
        /[.!?]$/.test(was.trim()) && !/[.!?:"')\]]$/.test(t.trim())
      ) {
        issues.push({
          kind: "fragment",
          where: `Block ${i + 1}`,
          detail: "block no longer ends with punctuation",
          text: t.slice(-110),
        });
      }
    });
  }

  const manualActions: ManualAction[] = rows
    .filter((r) => ["accept", "accept-delete"].includes(r.decision ?? "") && !r.applied_to_draft)
    .map((r) => ({
      reason:
        r.field_kind === "rawHtml"
          ? "Inside a comparison table — editing table HTML automatically risks corrupting the table"
          : r.field_kind === "linkHref"
            ? "This is a link URL — rewriting it automatically would break the link"
            : r.field_kind === "slug"
              ? "Changing the slug would break the live URL"
              : "The flagged text spans multiple styled spans (bold or a link), so editing it automatically could corrupt the formatting",
      disposition: r.disposition,
      decision: r.decision ?? "",
      fieldLabel: r.field_label,
      text: r.original_text,
    }));

  return {
    slug,
    postId,
    draftExists: Boolean(draft),
    publishedBlocks: pubBlocks.length,
    draftBlocks: draftBlocks.length,
    issues,
    manualActions,
    checkedAt: new Date().toISOString(),
  };
}

// --- Automatic repair of edit artifacts ------------------------------------
// The checker reports damage; this repairs it. Deliberately DETERMINISTIC: it
// only removes text that is provably duplicated, or fixes punctuation. It never
// rewrites meaning, never adds a claim, and never touches copy that is merely
// awkward — that is a judgement call and goes to Manual Reviews instead.

/** Remove an exact consecutive repeat of a phrase, keeping one copy. */
export function dedupePhrase(text: string): { fixed: string; removed: string | null } {
  const words = text.split(/\s+/).filter(Boolean);
  for (let n = Math.floor(words.length / 2); n >= 4; n--) {
    for (let i = 0; i + 2 * n <= words.length; i++) {
      const a = words.slice(i, i + n).join(" ");
      const b = words.slice(i + n, i + 2 * n).join(" ");
      const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      if (norm(a).length >= 20 && norm(a) === norm(b)) {
        const kept = [...words.slice(0, i + n), ...words.slice(i + 2 * n)].join(" ");
        return { fixed: kept, removed: a };
      }
    }
  }
  return { fixed: text, removed: null };
}

/** Collapse an immediately repeated sentence. */
export function dedupeSentence(text: string): { fixed: string; removed: string | null } {
  const parts = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let removed: string | null = null;
  for (const p of parts) {
    const norm = p.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    const prev = out.length ? out[out.length - 1].toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() : "";
    if (norm && norm === prev) { removed = p; continue; }
    out.push(p);
  }
  return { fixed: out.join(" "), removed };
}

export function tidyPunctuation(s: string): string {
  return s
    .replace(/ {2,}/g, " ")
    .replace(/\s*([,;])\s*(?=[,;])/g, "")
    .replace(/\s+([,;.!?])/g, "$1")
    .replace(/,\s*([.!?])/g, "$1")
    .replace(/([.!?])\s*,\s*/g, "$1 ")
    .replace(/([.!?])\1+/g, "$1")
    .trim();
}

export interface RepairResult {
  slug: string;
  postId: string;
  repaired: { where: string; path: string; removed: string; before: string; after: string }[];
  unrepairable: { where: string; detail: string; text: string }[];
}

/**
 * Repair artifacts in a draft. Only spans that are single-child, or whose
 * damage sits entirely inside one span, are touched — anything else would risk
 * link/bold markup and is reported for manual work instead.
 */
export async function repairDraft(slug: string, apply: boolean): Promise<RepairResult> {
  const rows = await getFindingsForSlug(slug);
  if (rows.length === 0) throw new Error(`No findings recorded for "${slug}"`);
  const postId = rows[0].post_id;
  const draft = await readDoc(`drafts.${postId}`);
  if (!draft) return { slug, postId, repaired: [], unrepairable: [] };

  const repaired: RepairResult["repaired"] = [];
  const unrepairable: RepairResult["unrepairable"] = [];
  const sets: Record<string, string> = {};

  const blocks = (draft.body as PtBlock[] | undefined) ?? [];
  blocks.forEach((b, i) => {
    if (b._type !== "block" || !b._key || !Array.isArray(b.children)) return;
    b.children.forEach((child, ci) => {
      const original = child.text ?? "";
      if (!original.trim()) return;
      // Preserve the span's own leading/trailing whitespace. A span very often
      // starts with a space because it follows a link — "Download Granola" +
      // " for free on Mac…". Trimming it would run the words together, so the
      // repair operates on the interior only and reattaches the edges.
      const lead = original.match(/^\s*/)?.[0] ?? "";
      const trail = original.match(/\s*$/)?.[0] ?? "";
      let working = original.slice(lead.length, original.length - trail.length);
      const core = working;
      const removedBits: string[] = [];

      for (let pass = 0; pass < 3; pass++) {
        const p = dedupePhrase(working);
        if (p.removed) { working = p.fixed; removedBits.push(p.removed); continue; }
        const s = dedupeSentence(working);
        if (s.removed) { working = s.fixed; removedBits.push(s.removed); continue; }
        break;
      }
      working = tidyPunctuation(working);

      // Only a real change counts. Whitespace-only differences are not damage,
      // and rewriting them would churn every span in the document.
      if (working === core) return;
      working = lead + working + trail;

      if (working !== original) {
        repaired.push({
          where: `Block ${i + 1}`,
          path: `body[_key=="${b._key}"].children[${ci}].text`,
          removed: removedBits.join(" | ") || "punctuation only",
          before: original.slice(0, 200),
          after: working.slice(0, 200),
        });
        sets[`body[_key=="${b._key}"].children[${ci}].text`] = working;
      }
    });

    // Damage spanning two spans cannot be fixed without risking markup.
    const joined = (b.children ?? []).map((c) => c.text ?? "").join("");
    if (
      !repaired.some((r) => r.path.includes(String(b._key))) &&
      (b.children?.length ?? 0) > 1
    ) {
      const words = joined.split(/\s+/).filter(Boolean);
      if (words.length > 10) {
        const p = dedupePhrase(joined);
        if (p.removed) {
          unrepairable.push({
            where: `Block ${i + 1}`,
            detail: "duplicated text spans a link or bold formatting — fix by hand to preserve the markup",
            text: p.removed.slice(0, 160),
          });
        }
      }
    }
  });

  if (apply && Object.keys(sets).length > 0) {
    const token = process.env.SANITY_WRITE_TOKEN?.trim();
    if (!token || /\s/.test(token)) throw new SanityTokenMissing();
    const res = await fetch(`${API}/data/mutate/${SANITY_DATASET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations: [{ patch: { id: `drafts.${postId}`, set: sets } }] }),
    });
    if (!res.ok) throw new Error(`Repair mutate failed: ${res.status}`);
  }

  return { slug, postId, repaired, unrepairable };
}

// --- Re-prompting a rewrite ------------------------------------------------
// A reviewer who dislikes a proposed rewrite but does not want the passage
// deleted needs a third option: steer it. This regenerates the rewrite from the
// original text plus their direction, under the same rules the review ran on.

const RULES_SUMMARY = `You are revising proposed replacement copy for Granola's published SEO articles, as part of a brand-safety and liability review.

The standard the copy must meet:

1. DISCLOSURE. A reader must never come away believing they can use Granola in a meeting without other participants knowing it is taking notes. Non-disclosure — others not knowing, not noticing, not being told — must never be positioned as a benefit, feature or reason to choose Granola.

2. NO BOT-DENIGRATION. Never position meeting bots as bad: not intrusive, not awkward, not unreliable, not high-friction. An article arguing bots are bad has already made imperceptibility the implicit benefit. Do not swap one anti-bot argument for another.

3. DO NOT INTRODUCE THE NO-BOT FACT. If the original passage did not make the point that no bot joins the call, your replacement must not add it.

4. FACTUAL ACCURACY. Granola's notes and transcripts are stored in Granola's cloud infrastructure and sync to Granola's servers. Never write or imply that notes stay only on the device, are stored locally only, are not in the cloud, or never touch a third-party server. Those claims are false.

5. WRITE TOWARD WHAT GRANOLA DOES — note quality, less time writing things up, staying present in the conversation, what the user gets afterwards — rather than what it avoids.

6. SCOPE. Your replacement must fit exactly the scope given. A sentence-scope replacement must read correctly between the sentences either side of it and must not restate them. A paragraph-scope replacement replaces the whole paragraph and must be written standalone.

7. Match the surrounding voice and register. Do not add claims that were not there. Do not pad.`;

export interface RegenerateResult {
  rewrite: string;
  explanation: string;
  scope: string;
}

/**
 * Ask the model for a revised rewrite, given the reviewer's direction.
 * Returns the proposal only — nothing is written to Sanity here.
 */
export async function regenerateRewrite(opts: {
  finding: FindingRow;
  feedback: string;
  contextBefore?: string;
  contextAfter?: string;
}): Promise<RegenerateResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured for this app. Add it in Vercel (Settings → Environment Variables) and redeploy.",
    );
  }
  const { finding, feedback } = opts;
  const scope = finding.rewrite_scope && finding.rewrite_scope !== "none"
    ? finding.rewrite_scope
    : "sentence";

  const user = `ARTICLE: ${finding.title}
FIELD: ${finding.field_label}

THE FLAGGED TEXT (${scope} scope — your replacement replaces exactly this much):
"""
${finding.original_text}
"""

WHY IT WAS FLAGGED:
${finding.reader_takeaway ?? "(not recorded)"}

THE REWRITE PREVIOUSLY PROPOSED, WHICH THE REVIEWER IS NOT HAPPY WITH:
"""
${finding.final_text ?? finding.proposed_text ?? "(none)"}
"""

THE REVIEWER'S DIRECTION — follow this closely; it takes precedence over the previous proposal, but never over the standard above:
"""
${feedback}
"""

Produce a revised replacement. It must still fully resolve the reason the text was flagged.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: RULES_SUMMARY,
      tools: [
        {
          name: "propose_rewrite",
          description: "Return the revised replacement copy.",
          input_schema: {
            type: "object",
            properties: {
              rewrite: {
                type: "string",
                description: `The replacement copy, at ${scope} scope. Plain prose, no quotes around it, no commentary.`,
              },
              explanation: {
                type: "string",
                description:
                  "One sentence on how this answers the reviewer's direction while still resolving the original problem.",
              },
            },
            required: ["rewrite", "explanation"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "propose_rewrite" },
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 400 && body.includes("credit balance")) {
      throw new Error("The Anthropic API credit balance is too low to generate a new rewrite.");
    }
    if (res.status === 401) throw new Error("The Anthropic API key was rejected (401).");
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    content: { type: string; input?: { rewrite?: string; explanation?: string } }[];
  };
  const block = json.content.find((b) => b.type === "tool_use");
  if (!block?.input?.rewrite) throw new Error("The model did not return a rewrite.");

  return {
    rewrite: block.input.rewrite,
    explanation: block.input.explanation ?? "",
    scope,
  };
}

/** Store a reviewer-approved replacement without applying it. */
export async function setProposedText(id: string, text: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE seo_review_findings
    SET proposed_text = ${text}, updated_at = NOW()
    WHERE id = ${id}`;
}
