"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

interface Mention {
  episodeId: string;
  podcastName: string | null;
  podcastReach: number | null;
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
              Reach
            </th>
            <th className="text-left py-2.5 px-4 font-medium text-text-secondary text-xs uppercase tracking-wider">
              Sentiment
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
                <td className="py-2.5 px-4 text-right text-text-secondary tabular-nums">
                  {m.podcastReach ?? "—"}
                </td>
                <td className={"py-2.5 px-4 " + sentimentColor(m.sentimentScore)}>
                  {m.sentimentLabel ?? "—"}
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
                      {m.summaryShort && (
                        <div>
                          <div className="font-medium text-text-secondary uppercase tracking-wider mb-1">
                            Summary
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
