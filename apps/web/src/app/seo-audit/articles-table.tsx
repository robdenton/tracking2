"use client";

import { useMemo, useState } from "react";
import type { SeoPost } from "@/lib/seo-audit";
import { postUrl } from "@/lib/seo-audit";

export interface RowStatus {
  total: number;
  red: number;
  amber: number;
  needing: number;
  decided: number;
  accepted: number;
  dismissed: number;
  applied: number;
}

function formatDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00Z" : s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Status pill derived from the decision log — colour AND text, never colour alone.
function StatusPill({ st }: { st?: RowStatus }) {
  if (!st) {
    return (
      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-sunken text-text-muted whitespace-nowrap">
        Not reviewed
      </span>
    );
  }
  const label =
    st.red > 0 && st.amber > 0
      ? `Red ${st.red} · Amber ${st.amber}`
      : st.red > 0
        ? `Red ${st.red}`
        : st.amber > 0
          ? `Amber ${st.amber}`
          : "Clean";
  const cls =
    st.red > 0
      ? "bg-red-100 text-red-700"
      : st.amber > 0
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

export function ArticlesTable({
  posts,
  statuses,
}: {
  posts: SeoPost[];
  statuses: Record<string, RowStatus>;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<
    "all" | "reviewed" | "unreviewed" | "red" | "applied" | "done"
  >("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      const st = statuses[p.slug];
      const matchText =
        !needle ||
        p.title?.toLowerCase().includes(needle) ||
        p.slug?.toLowerCase().includes(needle);
      const matchFilter =
        filter === "all"
          ? true
          : filter === "reviewed"
            ? Boolean(st)
            : filter === "unreviewed"
              ? !st
              : filter === "red"
                ? Boolean(st && st.red > 0)
                : filter === "done"
                  ? Boolean(st && st.needing > 0 && st.decided >= st.needing)
                  : Boolean(st && st.applied > 0);
      return matchText && matchFilter;
    });
  }, [posts, statuses, q, filter]);

  const chips: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "reviewed", label: "Reviewed" },
    { key: "unreviewed", label: "Not reviewed" },
    { key: "red", label: "Has red" },
    { key: "applied", label: "Has draft edits" },
    { key: "done", label: "Fully decided" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by title or slug…"
          className="flex-1 min-w-56 max-w-md px-3 py-2 text-sm bg-surface border border-border-light rounded-lg outline-none focus:border-accent-strong"
        />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filter === c.key
                  ? "bg-text-primary text-surface border-text-primary font-medium"
                  : "bg-surface text-text-secondary border-border-light hover:border-accent-strong"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
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
                Article
              </th>
              <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
                Review status
              </th>
              <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider whitespace-nowrap">
                Published
              </th>
              <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
                Open
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const st = statuses[p.slug];
              return (
                <tr
                  key={p._id}
                  className="border-b border-border-light hover:bg-surface-sunken/50"
                >
                  <td className="py-2.5 px-4 text-right text-text-muted tabular-nums align-top">
                    {i + 1}
                  </td>
                  <td className="py-2.5 px-4 align-top">
                    {st ? (
                      <a
                        href={`/review/${p.slug}.html`}
                        className="font-medium text-text-primary hover:text-accent-strong hover:underline"
                      >
                        {p.title || "(untitled)"}
                      </a>
                    ) : (
                      <span className="font-medium text-text-primary">
                        {p.title || "(untitled)"}
                      </span>
                    )}
                    <div className="text-xs text-text-muted mt-0.5 font-mono">{p.slug}</div>
                    {p.unpublished && (
                      <div className="mt-1">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                          Unpublished — not live
                        </span>
                      </div>
                    )}
                    {st && st.needing > 0 && (
                      <div className="text-xs mt-1">
                        <span
                          className={
                            st.decided >= st.needing
                              ? "text-green-700 font-medium"
                              : st.decided > 0
                                ? "text-amber-700"
                                : "text-text-muted"
                          }
                        >
                          {st.decided >= st.needing
                            ? `✓ All ${st.needing} decided`
                            : `${st.decided} of ${st.needing} decided`}
                        </span>
                        {st.applied > 0 && (
                          <span className="text-text-muted">
                            {" · "}
                            {st.applied} written to draft
                          </span>
                        )}
                        {st.decided > st.applied && (
                          <span className="text-text-muted">
                            {" · "}
                            {st.decided - st.applied} no change
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 align-top">
                    <StatusPill st={st} />
                    {st && (
                      <div className="text-xs text-text-muted mt-1">
                        {st.total} finding{st.total === 1 ? "" : "s"}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap align-top tabular-nums">
                    {formatDate(p.publishedAt)}
                  </td>
                  <td className="py-2.5 px-4 align-top whitespace-nowrap">
                    {st ? (
                      <a
                        href={`/review/${p.slug}.html`}
                        className="text-accent-strong hover:underline text-xs mr-3"
                      >
                        Review →
                      </a>
                    ) : (
                      <span className="text-text-muted text-xs mr-3" title="Not yet reviewed">
                        —
                      </span>
                    )}
                    {p.unpublished ? (
                      <span className="text-text-muted text-xs" title="Not published — the live URL would 404">
                        not live
                      </span>
                    ) : (
                      <a
                        href={postUrl(p.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-strong hover:underline text-xs"
                      >
                        Live ↗
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-text-muted">
                  No articles match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
