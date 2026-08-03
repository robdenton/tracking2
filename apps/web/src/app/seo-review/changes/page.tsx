import { getAppliedChanges, getPublishStatus } from "@/lib/seo-review";
import { SeoNav } from "../nav";

// Audit log of every copy change written to a Sanity DRAFT from the consent &
// disclosure review, with live draft/published status read from Sanity at
// request time (not a cached claim).
export const dynamic = "force-dynamic";

const STUDIO = (id: string) =>
  `https://oy7f1h9b.sanity.studio/structure/post;${encodeURIComponent(id)}`;

function fmt(d: Date | string | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function SeoChangeLogPage() {
  let rows: Awaited<ReturnType<typeof getAppliedChanges>> = [];
  let loadError: string | null = null;
  try {
    rows = await getAppliedChanges();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the change log.";
  }

  let status: Record<string, { draftExists: boolean; publishedUpdatedAt: string | null }> = {};
  if (rows.length > 0) {
    try {
      status = await getPublishStatus([...new Set(rows.map((r) => r.post_id))]);
    } catch {
      /* status is best-effort; the log itself still renders */
    }
  }

  const isPublished = (postId: string) => status[postId] && !status[postId].draftExists;
  const publishedCount = rows.filter((r) => isPublished(r.post_id)).length;
  const draftCount = rows.length - publishedCount;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <SeoNav active="changes" crumbs={[{ label: "SEO articles", href: "/seo-audit" }, { label: "Change log" }]} />
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        SEO review — change log
      </h1>
      <p className="text-text-secondary mb-6">
        Every copy change written to a Sanity <strong>draft</strong> from the consent &amp;
        disclosure review: what the text was, what it became, and why it was flagged.
        Publish status is read live from Sanity on each page load.
      </p>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Could not load the log:</strong> {loadError}
          <div className="mt-1 text-red-700">
            If this mentions a missing relation, the <code>seo_review_findings</code> table
            has not been created yet — it is created by the deploy&apos;s <code>prisma db push</code>.
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-8">
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-text-primary">{rows.length}</div>
          <div className="text-xs text-text-secondary">changes applied</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-amber-600">{draftCount}</div>
          <div className="text-xs text-text-secondary">draft — not live</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-green-700">{publishedCount}</div>
          <div className="text-xs text-text-secondary">published — live</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-text-primary">
            {new Set(rows.map((r) => r.slug)).size}
          </div>
          <div className="text-xs text-text-secondary">articles touched</div>
        </div>
      </div>

      {rows.length === 0 && !loadError ? (
        <p className="text-text-muted">
          No changes applied yet. Accepting a finding on a review page writes the rewrite to
          that article&apos;s Sanity draft and records it here.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const published = isPublished(r.post_id);
            return (
              <div key={r.id} className="bg-surface border border-border-light rounded-lg p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                      r.disposition === "red"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.disposition}
                  </span>
                  <span className="text-xs text-text-muted">
                    Layer {r.layer}
                    {r.term ? ` · “${r.term}”` : ""} · {r.field_label}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ml-auto ${
                      published
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {published ? "● Published — live" : "● Draft only — not live"}
                  </span>
                </div>

                <div className="font-medium text-text-primary mb-1">{r.slug}</div>
                {r.sanity_path && (
                  <div className="text-xs text-text-muted mb-3 font-mono break-all">
                    {r.sanity_path}
                  </div>
                )}

                <div className="mb-2">
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Was</div>
                  <div className="text-sm bg-red-50 border-l-2 border-red-300 px-3 py-2 rounded text-text-primary">
                    {r.original_text}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Now</div>
                  <div className="text-sm bg-green-50 border-l-2 border-green-300 px-3 py-2 rounded text-text-primary">
                    {r.final_text ?? r.proposed_text}
                  </div>
                </div>

                {r.reader_takeaway && (
                  <div className="text-sm text-text-secondary mb-3">
                    <span className="font-medium">Why: </span>
                    {r.reader_takeaway}
                  </div>
                )}
                {r.note && (
                  <div className="text-sm text-text-secondary mb-3">
                    <span className="font-medium">Your note: </span>
                    {r.note}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                  <span>Applied {fmt(r.applied_at)}</span>
                  {r.decided_by && <span>by {r.decided_by}</span>}
                  {published && status[r.post_id]?.publishedUpdatedAt && (
                    <span>Published {fmt(status[r.post_id].publishedUpdatedAt)}</span>
                  )}
                  <a
                    href={STUDIO(r.post_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-strong hover:underline"
                  >
                    {published ? "Open in Studio ↗" : "Review draft in Studio ↗"}
                  </a>
                  <a
                    href={`https://www.granola.ai/blog/${r.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-strong hover:underline"
                  >
                    Live article ↗
                  </a>
                  <a href={`/review/${r.slug}.html`} className="text-accent-strong hover:underline">
                    Review page
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
