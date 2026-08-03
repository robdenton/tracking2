import { fetchSeoPosts } from "@/lib/seo-audit";
import { getStatusBySlug } from "@/lib/seo-review";
import { getBuckets } from "@/lib/seo-buckets";
import { ArticlesTable, type RowStatus } from "./articles-table";
import { SeoNav } from "../seo-review/nav";

// Live from Sanity, so the list stays current without a redeploy. Review status
// comes from the decision log, so a row only claims to be reviewed when there
// are findings backing it.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SeoAuditPage() {
  const posts = await fetchSeoPosts(3600);
  const buckets = await getBuckets();

  let statuses: Record<string, RowStatus> = {};
  let statusError: string | null = null;
  try {
    statuses = await getStatusBySlug();
  } catch (e) {
    statusError = e instanceof Error ? e.message : "Could not load review status.";
  }

  const reviewed = posts.filter((p) => statuses[p.slug]).length;
  const withRed = posts.filter((p) => statuses[p.slug]?.red).length;
  const withDraftEdits = posts.filter((p) => statuses[p.slug]?.applied).length;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <SeoNav active="articles" crumbs={[{ label: "SEO articles" }]} />

      <h1 className="text-2xl font-semibold text-text-primary mb-1">SEO Articles</h1>
      <p className="text-text-secondary mb-6">
        {posts.length} published SEO articles (Sanity <code>post</code> documents with{" "}
        <code>hidden == true</code>), newest first. Click an article to open its consent
        &amp; disclosure review.
      </p>

      {statusError && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Review status unavailable ({statusError}). The article list below is still live.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-text-primary">{posts.length}</div>
          <div className="text-xs text-text-secondary">in scope</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-text-primary">{reviewed}</div>
          <div className="text-xs text-text-secondary">reviewed</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-text-primary">
            {posts.length - reviewed}
          </div>
          <div className="text-xs text-text-secondary">not reviewed</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-red-700">{withRed}</div>
          <div className="text-xs text-text-secondary">with red findings</div>
        </div>
        <div className="bg-surface border border-border-light rounded-lg px-4 py-3">
          <div className="text-xl font-semibold text-green-700">{withDraftEdits}</div>
          <div className="text-xs text-text-secondary">with draft edits</div>
        </div>
      </div>

      <ArticlesTable posts={posts} statuses={statuses} buckets={buckets} />
    </main>
  );
}
