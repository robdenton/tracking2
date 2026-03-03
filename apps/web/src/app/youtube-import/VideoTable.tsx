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
      // sortKey is a date string
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
      className="py-2 px-2 text-right text-xs font-medium cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap"
      onClick={() => handleSort(colKey)}
    >
      <div className="flex items-center justify-end gap-1">
        {children}
        {sortKey === colKey && (
          <span className="text-gray-400">
            {sortDir === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  // Format date as "Feb 24" for column headers
  const fmtDate = (d: string) => {
    const [, m, day] = d.split("-");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 dark:border-gray-800">
          <tr>
            <th className="text-left py-2 px-3 text-xs font-medium">Title</th>
            <th className="text-left py-2 px-3 text-xs font-medium">Channel</th>
            <th className="text-left py-2 px-2 text-xs font-medium">Source</th>
            {dates.map((date) => (
              <SortHeader key={date} colKey={date}>
                {fmtDate(date)}
              </SortHeader>
            ))}
            <SortHeader colKey="totalViews">Total</SortHeader>
            <th className="text-center py-2 px-2 text-xs font-medium">Link</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((video) => (
            <tr
              key={video.id}
              className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td className="py-2 px-3 max-w-[250px] truncate">
                <Link
                  href={`/youtube-import/${video.id}`}
                  className="hover:underline"
                  title={video.title}
                >
                  {video.title}
                </Link>
              </td>
              <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                {video.channelTitle}
              </td>
              <td className="py-2 px-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                    video.source === "paid_sponsorship"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : video.source === "paid_ad"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  }`}
                >
                  {video.source === "paid_sponsorship"
                    ? "Paid Sponsorship"
                    : video.source === "paid_ad"
                    ? "Paid Ad"
                    : "Organic"}
                </span>
              </td>
              {dates.map((date) => (
                <td
                  key={date}
                  className="py-2 px-2 text-right font-mono text-xs text-gray-500"
                >
                  {video.dailyViews[date] != null
                    ? video.dailyViews[date]!.toLocaleString()
                    : "—"}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-mono font-semibold">
                {video.totalViews != null
                  ? video.totalViews.toLocaleString()
                  : "—"}
              </td>
              <td className="py-2 px-2 text-center">
                <a
                  href={video.url}
                  target="_blank"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  YouTube →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
