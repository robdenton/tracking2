"use client";

import { useMemo, useState } from "react";

interface PodcastRow {
  podcastId: string;
  podcastName: string | null;
  podcastAudienceSize: number | null;
  totalMentions: number;
  organicMentions: number;
  paidMentions: number;
  firstMention: string | null;
  lastMention: string | null;
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

type SortKey =
  | "podcast"
  | "audience"
  | "totalMentions"
  | "organicMentions"
  | "paidMentions"
  | "first"
  | "last";
type SortDir = "asc" | "desc";

function getSortValue(p: PodcastRow, k: SortKey): string | number {
  switch (k) {
    case "podcast":
      return (p.podcastName ?? "").toLowerCase();
    case "audience":
      return p.podcastAudienceSize ?? -1;
    case "totalMentions":
      return p.totalMentions;
    case "organicMentions":
      return p.organicMentions;
    case "paidMentions":
      return p.paidMentions;
    case "first":
      return p.firstMention ?? "";
    case "last":
      return p.lastMention ?? "";
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

export function PodcastsTable({ podcasts }: { podcasts: PodcastRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("audience");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "podcast" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const arr = [...podcasts];
    arr.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [podcasts, sortKey, sortDir]);

  if (podcasts.length === 0) {
    return (
      <div className="bg-surface border border-border-light rounded-lg p-8 text-center">
        <p className="text-text-muted">No podcasts in this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-surface border border-border-light rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light bg-surface-sunken">
            <SortHeader label="Podcast" sortKey="podcast" current={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Est. Audience" sortKey="audience" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Total mentions" sortKey="totalMentions" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Organic" sortKey="organicMentions" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Paid" sortKey="paidMentions" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="First mention" sortKey="first" current={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Latest mention" sortKey="last" current={sortKey} dir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.podcastId} className="border-b border-border-light hover:bg-surface-sunken/50">
              <td className="py-2.5 px-4 text-text-primary font-medium">
                {p.podcastName ?? "—"}
              </td>
              <td className="py-2.5 px-4 text-right text-text-secondary tabular-nums">
                {formatAudience(p.podcastAudienceSize)}
              </td>
              <td className="py-2.5 px-4 text-right text-text-primary tabular-nums font-medium">
                {p.totalMentions}
              </td>
              <td className="py-2.5 px-4 text-right text-text-secondary tabular-nums">
                {p.organicMentions}
              </td>
              <td className="py-2.5 px-4 text-right text-text-secondary tabular-nums">
                {p.paidMentions}
              </td>
              <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                {formatDate(p.firstMention)}
              </td>
              <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                {formatDate(p.lastMention)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
