"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface VideoRow {
  id: string;
  title: string;
  channelTitle: string;
  importedDate: string;
  url: string;
  source: string;
  depthTier: string | null;
  depthScore: number | null;
  dailyViews: Record<string, number | null>;
  totalViews: number | null;
}

const DEPTH_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  dedicated: {
    label: "Dedicated",
    className:
      "bg-[#F3E8F3] text-[#8B6B8A]",
  },
  featured: {
    label: "Featured",
    className:
      "bg-accent-light text-accent-strong",
  },
  listed: {
    label: "Listed",
    className:
      "bg-[#FEF3C7] text-[#92400E]",
  },
  incidental: {
    label: "Incidental",
    className:
      "bg-surface-sunken text-text-secondary",
  },
};

const SOURCE_OPTIONS: {
  value: string;
  label: string;
  badgeLabel: string | null;
  className: string;
}[] = [
  {
    value: "organic",
    label: "Organic",
    badgeLabel: null,
    className: "",
  },
  {
    value: "paid_sponsorship",
    label: "Paid Sponsorship",
    badgeLabel: "Paid",
    className: "bg-accent-light text-accent-strong",
  },
  {
    value: "affiliate",
    label: "Affiliate",
    badgeLabel: "Affiliate",
    className: "bg-[#F3E8F3] text-[#8B6B8A]",
  },
  {
    value: "podcast",
    label: "Podcast",
    badgeLabel: "Podcast",
    className: "bg-accent-light text-accent-strong",
  },
];

function SourceBadge({
  videoId,
  source: initialSource,
}: {
  videoId: string;
  source: string;
}) {
  const [source, setSource] = useState(initialSource);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = SOURCE_OPTIONS.find((o) => o.value === source) ?? SOURCE_OPTIONS[0];

  async function handleSelect(value: string) {
    if (value === source) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setSource(value);
    setOpen(false);
    try {
      await fetch("/api/youtube/update-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, source: value }),
      });
    } catch {
      setSource(source); // revert on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium cursor-pointer transition-opacity ${
          saving ? "opacity-50" : ""
        } ${
          current.badgeLabel
            ? current.className
            : "bg-surface-sunken text-text-muted hover:bg-surface-sunken"
        }`}
        title="Click to change source tag"
      >
        {current.badgeLabel ?? "Tag"}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface border border-border-light rounded-lg shadow-xl py-1 min-w-[140px]">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-sunken flex items-center gap-2 ${
                opt.value === source ? "font-semibold" : ""
              }`}
            >
              {opt.badgeLabel ? (
                <span
                  className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium ${opt.className}`}
                >
                  {opt.badgeLabel}
                </span>
              ) : (
                <span className="text-text-muted text-[9px]">None</span>
              )}
              <span>{opt.label}</span>
              {opt.value === source && (
                <span className="ml-auto text-accent-strong text-[10px]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type SortDirection = "asc" | "desc";

export function VideoTable({
  videos,
  dates,
}: {
  videos: VideoRow[];
  dates: string[];
}) {
  const [sortKey, setSortKey] = useState<string>("totalViews");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...videos].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    if (sortKey === "totalViews") {
      aVal = a.totalViews ?? -1;
      bVal = b.totalViews ?? -1;
    } else if (sortKey === "depthScore") {
      aVal = a.depthScore ?? -1;
      bVal = b.depthScore ?? -1;
    } else {
      aVal = a.dailyViews[sortKey] ?? -1;
      bVal = b.dailyViews[sortKey] ?? -1;
    }

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortHeader = ({
    colKey,
    children,
  }: {
    colKey: string;
    children: React.ReactNode;
  }) => (
    <th
      className="py-1.5 px-1 text-right text-[11px] font-medium cursor-pointer hover:text-text-primary whitespace-nowrap"
      onClick={() => handleSort(colKey)}
    >
      <div className="flex items-center justify-end gap-0.5">
        {children}
        {sortKey === colKey && (
          <span className="text-text-muted">
            {sortDir === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  // Format date as compact "22/2"
  const fmtDate = (d: string) => {
    const [, m, day] = d.split("-");
    return `${parseInt(day, 10)}/${parseInt(m, 10)}`;
  };

  return (
    <div>
      <table className="w-full text-xs">
        <thead className="border-b border-border-light">
          <tr>
            <th className="text-left py-1.5 px-2 text-[11px] font-medium">Title</th>
            <th className="text-left py-1.5 px-1 text-[11px] font-medium">Channel</th>
            <th className="py-1.5 px-1 text-[11px] font-medium text-center">Type</th>
            <SortHeader colKey="depthScore">Depth</SortHeader>
            {dates.map((date) => (
              <SortHeader key={date} colKey={date}>
                {fmtDate(date)}
              </SortHeader>
            ))}
            <SortHeader colKey="totalViews">Total</SortHeader>
            <th className="py-1.5 px-1 text-[11px] font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((video) => (
            <tr
              key={video.id}
              className="border-b border-border-light transition-colors hover:bg-surface-sunken"
            >
              <td className="py-1.5 px-2 max-w-[200px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Link
                    href={`/youtube-import/${video.id}`}
                    className="hover:underline truncate"
                    title={video.title}
                  >
                    {video.title}
                  </Link>
                </div>
              </td>
              <td className="py-1.5 px-1 text-text-secondary max-w-[100px] truncate">
                <Link
                  href={`/youtube-import/channel/${encodeURIComponent(video.channelTitle)}`}
                  className="hover:underline"
                  title={video.channelTitle}
                >
                  {video.channelTitle}
                </Link>
              </td>
              <td className="py-1.5 px-1 text-center">
                <SourceBadge videoId={video.id} source={video.source} />
              </td>
              <td className="py-1.5 px-1 text-center whitespace-nowrap">
                {video.depthTier && DEPTH_BADGE[video.depthTier] ? (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${DEPTH_BADGE[video.depthTier].className}`}
                    title={`Depth score: ${video.depthScore?.toFixed(2) ?? "?"}`}
                  >
                    {DEPTH_BADGE[video.depthTier].label}
                  </span>
                ) : (
                  <span className="text-text-muted text-[9px]">—</span>
                )}
              </td>
              {dates.map((date) => (
                <td
                  key={date}
                  className="py-1.5 px-1 text-right font-mono text-[11px] text-text-secondary tabular-nums"
                >
                  {video.dailyViews[date] != null
                    ? video.dailyViews[date]! > 0
                      ? `+${video.dailyViews[date]!.toLocaleString()}`
                      : video.dailyViews[date]!.toLocaleString()
                    : "—"}
                </td>
              ))}
              <td className="py-1.5 px-1 text-right font-mono font-semibold tabular-nums">
                {video.totalViews != null
                  ? video.totalViews.toLocaleString()
                  : "—"}
              </td>
              <td className="py-1.5 px-1 text-center">
                <a
                  href={video.url}
                  target="_blank"
                  className="text-accent-strong hover:underline"
                  title="Open on YouTube"
                >
                  ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
