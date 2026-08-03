import { fetchSeoPosts } from "@/lib/seo-audit";
import { ArticlesTable } from "./articles-table";

// Revalidate hourly so the list stays current without a redeploy.
export const revalidate = 3600;

export default async function SeoAuditPage() {
  const posts = await fetchSeoPosts(revalidate);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        SEO Articles
      </h1>
      <p className="text-text-secondary mb-6">
        {posts.length} published SEO articles (Sanity <code>post</code> documents
        with <code>hidden == true</code>), newest first. Fetched live from Sanity
        and cached for an hour. Links open the live article on granola.ai.
      </p>
      <ArticlesTable posts={posts} />
    </main>
  );
}
