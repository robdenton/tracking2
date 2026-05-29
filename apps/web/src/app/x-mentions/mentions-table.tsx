"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Mention {
  tweetId: string;
  text: string;
  postedAt: Date;
  authorUsername: string | null;
  authorName: string | null;
  authorFollowers: number | null;
  authorVerified: boolean | null;
  impressionCount: number;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  llmClassification: string | null;
  llmReasoning: string | null;
}

function formatCompact(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tweetUrl(m: Mention): string {
  return m.authorUsername
    ? `https://x.com/${m.authorUsername}/status/${m.tweetId}`
    : `https://x.com/i/status/${m.tweetId}`;
}

type SortKey =
  | "date"
  | "author"
  | "followers"
  | "impressions"
  | "likes"
  | "retweets";
type SortDir = "asc" | "desc";

function getSortValue(m: Mention, k: SortKey): string | number {
  switch (k) {
    case "date":
      return m.postedAt.getTime();
    case "author":
      return (m.authorUsername ?? "").toLowerCase();
    case "followers":
      return m.authorFollowers ?? -1;
    case "impressions":
      return m.impressionCount;
    case "likes":
      return m.likeCount;
    case "retweets":
      return m.retweetCount;
  }
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

export function XMentionsTable({ mentions }: { mentions: Mention[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("impressions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "author" ? "asc" : "desc");
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

  async function handleHide(tweetId: string) {
    if (!confirm("Hide this tweet? It won't appear in the list anymore.")) return;
    setHidingId(tweetId);
    try {
      await fetch("/api/x/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetId }),
      });
      router.refresh();
    } catch {
      alert("Failed to hide.");
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
            <SortHeader label="Author" sortKey="author" current={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Tweet
            </th>
            <SortHeader label="Followers" sortKey="followers" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Impressions" sortKey="impressions" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Likes" sortKey="likes" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="RTs" sortKey="retweets" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <th className="py-2.5 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <Fragment key={m.tweetId}>
              <tr
                className="border-b border-border-light hover:bg-surface-sunken/50 cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === m.tweetId ? null : m.tweetId)
                }
              >
                <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                  {formatDate(m.postedAt)}
                </td>
                <td className="py-2.5 px-4 text-text-primary whitespace-nowrap">
                  <a
                    href={`https://x.com/${m.authorUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline font-medium"
                  >
                    @{m.authorUsername ?? "?"}
                  </a>
                  {m.authorVerified && (
                    <span className="ml-1 text-accent-strong" title="Verified">
                      ✓
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-text-primary max-w-xl truncate">
                  {m.text}
                </td>
                <td className="py-2.5 px-4 text-right text-text-secondary tabular-nums">
                  {formatCompact(m.authorFollowers)}
                </td>
                <td className="py-2.5 px-4 text-right text-text-primary tabular-nums font-medium">
                  {formatCompact(m.impressionCount)}
                </td>
                <td className="py-2.5 px-4 text-right text-text-secondary tabular-nums">
                  {formatCompact(m.likeCount)}
                </td>
                <td className="py-2.5 px-4 text-right text-text-secondary tabular-nums">
                  {formatCompact(m.retweetCount)}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span className="text-text-muted text-xs">
                    {expandedId === m.tweetId ? "▴" : "▾"}
                  </span>
                </td>
              </tr>
              {expandedId === m.tweetId && (
                <tr className="border-b border-border-light bg-surface-sunken/30">
                  <td colSpan={8} className="py-4 px-4">
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="font-medium text-text-secondary uppercase tracking-wider mb-1">
                          Tweet
                        </div>
                        <div className="text-text-primary leading-relaxed whitespace-pre-wrap">
                          {m.text}
                        </div>
                      </div>
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
                      <div className="flex gap-3 pt-2">
                        <a
                          href={tweetUrl(m)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-strong hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View on X →
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHide(m.tweetId);
                          }}
                          disabled={hidingId === m.tweetId}
                          className="text-text-muted hover:text-[#B85C38] disabled:opacity-50"
                        >
                          {hidingId === m.tweetId ? "Hiding..." : "Hide (false positive)"}
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
