"use client";

import { useState } from "react";
import Link from "next/link";

interface VideoRow {
  id: string;
  title: string;
  channelTitle: string;
  importedDate: string;
  url: string;
  source: string;
  dailyViews: Record<string, number | null>;
  totalViews: number | null;
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
      className="py-1.5 px-1 text-right text-[11px] font-medium cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap"
      onClick={() => handleSort(colKey)}
    >
      <div className="flex items-center justify-end gap-0.5">
        {children}
        {sortKey === colKey && (
          <span className="text-gray-400">
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
        <thead className="border-b border-gray-200 dark:border-gray-800">
          <tr>
            <th className="text-left py-1.5 px-2 text-[11px] font-medium">Title</th>
            <th className="text-left py-1.5 px-1 text-[11px] font-medium">Channel</th>
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
              className="border-b border-gray-100 dark:border-gray-900 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
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
                  {video.source === "paid_sponsorship" && (
                    <span className="shrink-0 inline-block px-1 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Paid
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1.5 px-1 text-gray-500 max-w-[100px] truncate">
                <Link
                  href={`/youtube-import/channel/${encodeURIComponent(video.channelTitle)}`}
                  className="hover:underline"
                  title={video.channelTitle}
                >
                  {video.channelTitle}
                </Link>
              </td>
              {dates.map((date) => (
                <td
                  key={date}
                  className="py-1.5 px-1 text-right font-mono text-[11px] text-gray-500 tabular-nums"
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
                  className="text-blue-600 dark:text-blue-400 hover:underline"
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
