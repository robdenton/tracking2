"use client";

import { useMemo, useState } from "react";
import type { SeoPost } from "@/lib/seo-audit";
import { postUrl } from "@/lib/seo-audit";

function formatDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00Z" : s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ArticlesTable({ posts }: { posts: SeoPost[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter(
      (p) =>
        p.title?.toLowerCase().includes(needle) ||
        p.slug?.toLowerCase().includes(needle),
    );
  }, [posts, q]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by title or slug…"
        className="w-full max-w-lg mb-4 px-3 py-2 text-sm bg-surface border border-border-light rounded-lg outline-none focus:border-accent-strong"
      />
      <div className="mb-2 text-xs text-text-muted">
        Showing {filtered.length} of {posts.length}
      </div>
      <div className="overflow-x-auto bg-surface border border-border-light rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light bg-surface-sunken">
              <th className="text-right py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider w-12">
                #
              </th>
              <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
                Title &amp; link
              </th>
              <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider whitespace-nowrap">
                Published
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p._id}
                className="border-b border-border-light hover:bg-surface-sunken/50"
              >
                <td className="py-2.5 px-4 text-right text-text-muted tabular-nums align-top">
                  {i + 1}
                </td>
                <td className="py-2.5 px-4 align-top">
                  <div className="font-medium text-text-primary">
                    {p.title || "(untitled)"}
                  </div>
                  {p.slug ? (
                    <a
                      href={postUrl(p.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-strong hover:underline text-xs break-all"
                    >
                      {postUrl(p.slug)}
                    </a>
                  ) : (
                    <span className="text-text-muted text-xs">no slug</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap align-top tabular-nums">
                  {formatDate(p.publishedAt)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 px-4 text-center text-text-muted">
                  No articles match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
