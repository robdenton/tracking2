"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Mention {
  episodeId: string;
  podcastName: string | null;
  podcastReach: number | null;
  podcastAudienceSize: number | null;
  episodeTitle: string | null;
  episodeUrl: string | null;
  postedAt: string | null;
  durationSec: number | null;
  isSponsored: boolean | null;
  sponsoredScore: number | null;
  sponsoredReason: string | null;
  summaryShort: string | null;
  sentimentLabel: string | null;
  sentimentScore: number | null;
  confidenceTier: string | null;
  matchedQueries: string | null;
  snippets: string | null;
  llmClassification: string | null;
  llmReasoning: string | null;
}

function formatAudience(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function formatDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  return `${m}m`;
}

type SortKey = "date" | "podcast" | "episode" | "audience" | "source" | "type";
type SortDir = "asc" | "desc";

function getSortValue(m: Mention, key: SortKey): string | number {
  switch (key) {
    case "date":
      return m.postedAt ?? "";
    case "podcast":
      return (m.podcastName ?? "").toLowerCase();
    case "episode":
      return (m.episodeTitle ?? "").toLowerCase();
    case "audience":
      return m.podcastAudienceSize ?? -1;
    case "source":
      return m.confidenceTier === "high" ? 1 : 0;
    case "type":
      return m.isSponsored ? 1 : 0;
  }
}

function formatMatchedQueries(s: string | null): string[] {
  if (!s) return [];
  return s.split(",").map((q) => q.trim()).filter(Boolean);
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={
        "py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider cursor-pointer select-none hover:text-text-primary " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span
          className={
            "text-[9px] " + (active ? "text-text-primary" : "text-text-muted/40")
          }
        >
          {active ? (dir === "asc" ? "▲" : "▼") : "▼"}
        </span>
      </span>
    </th>
  );
}

export function MentionsTable({
  mentions,
  view,
}: {
  mentions: Mention[];
  view: "organic" | "paid" | "all";
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("audience");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // Sensible defaults per column
      setSortDir(key === "audience" ? "desc" : key === "date" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const arr = [...mentions];
    arr.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [mentions, sortKey, sortDir]);

  async function handleHide(episodeId: string) {
    if (!confirm("Hide this episode? It won't appear in the list anymore.")) return;
    setHidingId(episodeId);
    try {
      await fetch("/api/podscan/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId }),
      });
      router.refresh();
    } catch {
      alert("Failed to hide. Please try again.");
    } finally {
      setHidingId(null);
    }
  }

  return (
    <div className="overflow-x-auto bg-surface border border-border-light rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light bg-surface-sunken">
            <SortHeader label="Date" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Podcast" sortKey="podcast" current={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Episode" sortKey="episode" current={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Est. Audience" sortKey="audience" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Source" sortKey="source" current={sortKey} dir={sortDir} onSort={handleSort} />
            {view !== "organic" && (
              <SortHeader label="Type" sortKey="type" current={sortKey} dir={sortDir} onSort={handleSort} />
            )}
            <th className="py-2.5 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <Fragment key={m.episodeId}>
              <tr
                className="border-b border-border-light hover:bg-surface-sunken/50 cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === m.episodeId ? null : m.episodeId)
                }
              >
                <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                  {formatDate(m.postedAt)}
                </td>
                <td className="py-2.5 px-4 text-text-primary font-medium">
                  {m.podcastName ?? "—"}
                </td>
                <td className="py-2.5 px-4 text-text-primary">
                  {m.episodeTitle ?? "—"}
                  <span className="text-text-muted ml-2 text-xs">
                    {formatDuration(m.durationSec)}
                  </span>
                </td>
                <td
                  className="py-2.5 px-4 text-right text-text-secondary tabular-nums"
                  title={
                    m.podcastReach !== null
                      ? `Podscan reach score: ${m.podcastReach}/100`
                      : undefined
                  }
                >
                  {formatAudience(m.podcastAudienceSize)}
                </td>
                <td
                  className="py-2.5 px-4 relative group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={
                      "text-xs px-2 py-0.5 rounded cursor-help " +
                      (m.confidenceTier === "high"
                        ? "bg-accent-light text-accent-strong"
                        : "bg-[#F4EFE6] text-[#8B7350]")
                    }
                  >
                    {m.confidenceTier === "high" ? "High" : "Medium"}
                  </span>
                  {/* Hover popover */}
                  <div className="invisible group-hover:visible absolute z-50 left-0 top-full mt-1 w-80 p-3 rounded-lg border border-border bg-surface shadow-lg text-xs space-y-2 normal-case font-normal">
                    {m.llmReasoning && (
                      <div>
                        <div className="font-semibold text-text-primary mb-1">
                          Why this is Granola
                        </div>
                        <div className="text-text-secondary leading-relaxed">
                          {m.llmReasoning}
                        </div>
                      </div>
                    )}
                    {m.matchedQueries && (
                      <div>
                        <div className="font-semibold text-text-primary mb-1">
                          Matched search{formatMatchedQueries(m.matchedQueries).length > 1 ? "es" : ""}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {formatMatchedQueries(m.matchedQueries).map((q, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-surface-sunken text-text-secondary font-mono text-[10px]"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                {view !== "organic" && (
                  <td className="py-2.5 px-4">
                    {m.isSponsored ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#FFF4E6] text-[#B85C38]">
                        Paid
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-accent-light text-accent-strong">
                        Organic
                      </span>
                    )}
                  </td>
                )}
                <td className="py-2.5 px-4 text-right">
                  <span className="text-text-muted text-xs">
                    {expandedId === m.episodeId ? "▴" : "▾"}
                  </span>
                </td>
              </tr>
              {expandedId === m.episodeId && (
                <tr className="border-b border-border-light bg-surface-sunken/30">
                  <td colSpan={view !== "organic" ? 7 : 6} className="py-4 px-4">
                    <div className="space-y-3 text-xs">
                      {m.snippets && (
                        <div>
                          <div className="font-medium text-text-secondary uppercase tracking-wider mb-1">
                            Transcript context
                          </div>
                          <div className="text-text-primary leading-relaxed italic">
                            &ldquo;{m.snippets}&rdquo;
                          </div>
                        </div>
                      )}
                      {m.llmClassification && m.llmReasoning && (
                        <div>
                          <div className="font-medium text-text-secondary uppercase tracking-wider mb-1">
                            AI classification: {m.llmClassification}
                          </div>
                          <div className="text-text-primary leading-relaxed">
                            {m.llmReasoning}
                          </div>
                        </div>
                      )}
                      {m.summaryShort && (
                        <div>
                          <div className="font-medium text-text-secondary uppercase tracking-wider mb-1">
                            Episode summary
                          </div>
                          <div className="text-text-primary leading-relaxed">
                            {m.summaryShort}
                          </div>
                        </div>
                      )}
                      {m.sponsoredReason && (
                        <div>
                          <div className="font-medium text-text-secondary uppercase tracking-wider mb-1">
                            Why classified as {m.isSponsored ? "paid" : "organic"}{" "}
                            {m.sponsoredScore !== null
                              ? `(${Math.round(m.sponsoredScore * 100)}%)`
                              : ""}
                          </div>
                          <div className="text-text-primary leading-relaxed">
                            {m.sponsoredReason}
                          </div>
                        </div>
                      )}
                      {m.matchedQueries && (
                        <div>
                          <div className="font-medium text-text-secondary uppercase tracking-wider mb-1">
                            Matched queries
                          </div>
                          <div className="text-text-primary leading-relaxed font-mono text-[11px]">
                            {m.matchedQueries}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        {m.episodeUrl && (
                          <a
                            href={m.episodeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-strong hover:underline"
                          >
                            Listen →
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHide(m.episodeId);
                          }}
                          disabled={hidingId === m.episodeId}
                          className="text-text-muted hover:text-[#B85C38] disabled:opacity-50"
                        >
                          {hidingId === m.episodeId ? "Hiding..." : "Hide (false positive)"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
