import changeLog from "@/data/seo-change-log.json";

// Audit record of every copy change applied to a Sanity DRAFT from the consent
// & disclosure review. Nothing here is live until someone publishes the draft
// in the Studio — `published` on each row reflects that.
export const dynamic = "force-static";

interface ChangeRow {
  appliedAt: string;
  target: string;
  draftId: string;
  publishedId: string;
  slug: string;
  path: string;
  disposition: string;
  layer: string;
  term: string | null;
  field: string;
  originalText: string;
  newText: string;
  readerTakeaway: string;
  appliedBy: string;
  published: boolean;
}

const rows = changeLog as ChangeRow[];

function fmt(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STUDIO = (id: string) =>
  `https://oy7f1h9b.sanity.studio/structure/post;${encodeURIComponent(id)}`;

export default function SeoChangeLogPage() {
  const unpublished = rows.filter((r) => !r.published).length;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        SEO review — change log
      </h1>
      <p className="text-text-secondary mb-6">
        Every copy change applied to a Sanity <strong>draft</strong> from the consent &amp;
        disclosure review. Each row records what the text was, what it became, and why it
        was flagged. Nothing is live until the draft is published in the Studio.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-text-primary">{rows.length}</div>
          <div className="text-xs text-text-secondary">changes applied</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-amber-600">{unpublished}</div>
          <div className="text-xs text-text-secondary">awaiting publish</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-text-primary">
            {new Set(rows.map((r) => r.slug)).size}
          </div>
          <div className="text-xs text-text-secondary">articles touched</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-text-muted">No changes applied yet.</p>
      ) : (
        <div className="space-y-4">
          {rows
            .slice()
            .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
            .map((r, i) => (
              <div
                key={`${r.slug}-${i}`}
                className="bg-surface border border-border-light rounded-lg p-5"
              >
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
                    {r.term ? ` · “${r.term}”` : ""} · {r.field}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ml-auto ${
                      r.published
                        ? "bg-green-100 text-green-700"
                        : "bg-surface-sunken text-text-secondary border border-border-light"
                    }`}
                  >
                    {r.published ? "Published" : "Draft only — not live"}
                  </span>
                </div>

                <div className="font-medium text-text-primary mb-1">{r.slug}</div>
                <div className="text-xs text-text-muted mb-3 font-mono break-all">
                  {r.path}
                </div>

                <div className="mb-2">
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
                    Was
                  </div>
                  <div className="text-sm bg-red-50 border-l-2 border-red-300 px-3 py-2 rounded text-text-primary">
                    {r.originalText}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
                    Now
                  </div>
                  <div className="text-sm bg-green-50 border-l-2 border-green-300 px-3 py-2 rounded text-text-primary">
                    {r.newText}
                  </div>
                </div>

                <div className="text-sm text-text-secondary mb-3">
                  <span className="font-medium">Why: </span>
                  {r.readerTakeaway}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                  <span>{fmt(r.appliedAt)}</span>
                  <span>{r.appliedBy}</span>
                  <a
                    href={STUDIO(r.publishedId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-strong hover:underline"
                  >
                    Open draft in Sanity Studio ↗
                  </a>
                  <a
                    href={`https://www.granola.ai/blog/${r.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-strong hover:underline"
                  >
                    Live article ↗
                  </a>
                  <a
                    href={`/review/${r.slug}.html`}
                    className="text-accent-strong hover:underline"
                  >
                    Review page
                  </a>
                </div>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}
