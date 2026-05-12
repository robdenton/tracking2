"use client";

import { Fragment, useState } from "react";
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

function sentimentColor(score: number | null): string {
  if (score === null || score === undefined) return "text-text-muted";
  if (score >= 0.5) return "text-accent-strong";
  if (score >= 0.2) return "text-[#7ba382]";
  if (score <= -0.2) return "text-[#B85C38]";
  return "text-text-muted";
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
            <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Date
            </th>
            <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Podcast
            </th>
            <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Episode
            </th>
            <th className="text-right py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Est. Audience
            </th>
            <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Sentiment
            </th>
            <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Confidence
            </th>
            {view !== "organic" && (
              <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
                Type
              </th>
            )}
            <th className="py-2.5 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {mentions.map((m) => (
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
                <td className={"py-2.5 px-4 " + sentimentColor(m.sentimentScore)}>
                  {m.sentimentLabel ?? "—"}
                </td>
                <td className="py-2.5 px-4">
                  {m.confidenceTier === "high" ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-accent-light text-accent-strong">
                      High
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#F4EFE6] text-[#8B7350]">
                      Medium
                    </span>
                  )}
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
                  <td colSpan={view !== "organic" ? 8 : 7} className="py-4 px-4">
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
