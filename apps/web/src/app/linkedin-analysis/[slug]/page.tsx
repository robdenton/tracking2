"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Post {
  id: string;
  postText: string;
  postDate: string | null;
  postUrl: string | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  views: number | null;
  category: string | null;
  categoryReasoning: string | null;
}

interface CompanyData {
  id: string;
  slug: string;
  name: string | null;
  linkedinUrl: string;
  scrapedAt: string;
  posts: Post[];
}

// Consistent colour mapping for category badges
const CATEGORY_COLOURS: Record<string, string> = {
  "Social Proof": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Customer Announcement": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "Product Launch": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Brand & Storytelling": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Thought Leadership": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "Event": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Hiring": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Partnership": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Community & Engagement": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "Uncategorised": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function categoryColour(category: string | null): string {
  if (!category) return CATEGORY_COLOURS["Uncategorised"];
  return CATEGORY_COLOURS[category] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function CategoryBadge({ category }: { category: string | null }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryColour(category)}`}
    >
      {category ?? "Uncategorised"}
    </span>
  );
}

function formatNum(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 200;
  if (text.length <= limit) return <span>{text}</span>;
  return (
    <span>
      {expanded ? text : text.slice(0, limit) + "…"}{" "}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-blue-500 hover:underline text-xs"
      >
        {expanded ? "less" : "more"}
      </button>
    </span>
  );
}

export default function LinkedInAnalysisSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reanalysing, setReanalysing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/linkedin-analysis/company/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCompany(data);
        }
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleReanalyse() {
    setReanalysing(true);
    setError(null);
    try {
      const res = await fetch("/api/linkedin-analysis/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: company?.linkedinUrl, force: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Re-analysis failed.");
        return;
      }
      // Reload data
      const refreshed = await fetch(`/api/linkedin-analysis/company/${slug}`).then((r) => r.json());
      setCompany(refreshed);
    } catch {
      setError("Network error during re-analysis.");
    } finally {
      setReanalysing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300 mb-4">
          {error ?? "Company not found."}
        </div>
        <button
          onClick={() => router.push("/linkedin-analysis")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Analyse another company
        </button>
      </div>
    );
  }

  // Build category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const post of company.posts) {
    const cat = post.category ?? "Uncategorised";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const sortedCategories = Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a
  );
  const total = company.posts.length;

  const filteredPosts =
    activeCategory === null
      ? company.posts
      : company.posts.filter(
          (p) => (p.category ?? "Uncategorised") === activeCategory
        );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push("/linkedin-analysis")}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold">
              {company.name ?? slug}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <a
              href={company.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {company.linkedinUrl}
            </a>
            <span>·</span>
            <span>Last analysed {timeAgo(company.scrapedAt)}</span>
            <span>·</span>
            <span>{total} posts</span>
          </div>
        </div>
        <button
          onClick={handleReanalyse}
          disabled={reanalysing}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {reanalysing ? "Re-analysing..." : "Re-analyse"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Category breakdown */}
      <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-medium mb-3">Content mix</h2>
        <div className="space-y-2">
          {sortedCategories.map(([cat, count]) => {
            const pct = Math.round((count / total) * 100);
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(isActive ? null : cat)
                }
                className={`w-full text-left group ${isActive ? "opacity-100" : "opacity-90 hover:opacity-100"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={cat} />
                    {isActive && (
                      <span className="text-xs text-blue-500">filtered</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-80"}`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: getCategoryBarColour(cat),
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
        {activeCategory && (
          <button
            onClick={() => setActiveCategory(null)}
            className="mt-3 text-xs text-blue-500 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Posts list */}
      <div>
        <h2 className="text-sm font-medium mb-3 text-gray-500">
          {activeCategory
            ? `${filteredPosts.length} post${filteredPosts.length !== 1 ? "s" : ""} · ${activeCategory}`
            : `All ${total} posts`}
        </h2>
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <CategoryBadge category={post.category} />
                <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                  {post.postDate && <span>{post.postDate}</span>}
                  {post.postUrl && (
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View post ↗
                    </a>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                <ExpandableText text={post.postText} />
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-400">
                {post.likes !== null && (
                  <span title="Likes / reactions">
                    👍 {formatNum(post.likes)}
                  </span>
                )}
                {post.comments !== null && (
                  <span title="Comments">
                    💬 {formatNum(post.comments)}
                  </span>
                )}
                {post.reposts !== null && (
                  <span title="Reposts">
                    🔁 {formatNum(post.reposts)}
                  </span>
                )}
                {post.views !== null && (
                  <span title="Impressions">
                    👁 {formatNum(post.views)}
                  </span>
                )}
                {post.categoryReasoning && (
                  <span
                    className="ml-auto text-gray-400 italic"
                    title={post.categoryReasoning}
                  >
                    {post.categoryReasoning.slice(0, 80)}
                    {post.categoryReasoning.length > 80 ? "…" : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCategoryBarColour(category: string): string {
  const map: Record<string, string> = {
    "Social Proof": "#16a34a",
    "Customer Announcement": "#0d9488",
    "Product Launch": "#2563eb",
    "Brand & Storytelling": "#9333ea",
    "Thought Leadership": "#4f46e5",
    "Event": "#ea580c",
    "Hiring": "#ca8a04",
    "Partnership": "#db2777",
    "Community & Engagement": "#0891b2",
    "Uncategorised": "#9ca3af",
  };
  return map[category] ?? "#9ca3af";
}
