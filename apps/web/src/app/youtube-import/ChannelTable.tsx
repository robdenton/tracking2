"use client";

import { useState } from "react";
import Link from "next/link";

interface ChannelRow {
  channelTitle: string;
  videoCount: number;
  paidCount: number;
  totalViews: number;
  dailyViews: Record<string, number | null>;
}

type SortDirection = "asc" | "desc";

export function ChannelTable({
  channels,
  dates,
}: {
  channels: ChannelRow[];
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

  const sorted = [...channels].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    if (sortKey === "totalViews") {
      aVal = a.totalViews;
      bVal = b.totalViews;
    } else if (sortKey === "videoCount") {
      aVal = a.videoCount;
      bVal = b.videoCount;
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
            {sortDir === "asc" ? "\u2191" : "\u2193"}
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
            <th className="text-left py-1.5 px-2 text-[11px] font-medium">
              Channel
            </th>
            <SortHeader colKey="videoCount">Videos</SortHeader>
            {dates.map((date) => (
              <SortHeader key={date} colKey={date}>
                {fmtDate(date)}
              </SortHeader>
            ))}
            <SortHeader colKey="totalViews">Total</SortHeader>
          </tr>
        </thead>
        <tbody>
          {sorted.map((channel) => (
            <tr
              key={channel.channelTitle}
              className="border-b border-border-light transition-colors hover:bg-surface-sunken"
            >
              <td className="py-1.5 px-2 max-w-[220px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Link
                    href={`/youtube-import/channel/${encodeURIComponent(channel.channelTitle)}`}
                    className="hover:underline truncate"
                    title={channel.channelTitle}
                  >
                    {channel.channelTitle}
                  </Link>
                  {channel.paidCount > 0 && (
                    <span className="shrink-0 inline-block px-1 py-0.5 rounded text-[9px] font-medium bg-accent-light text-accent-strong">
                      {channel.paidCount} Paid
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1.5 px-1 text-right font-mono text-[11px] text-text-secondary tabular-nums">
                {channel.videoCount}
              </td>
              {dates.map((date) => (
                <td
                  key={date}
                  className="py-1.5 px-1 text-right font-mono text-[11px] text-text-secondary tabular-nums"
                >
                  {channel.dailyViews[date] != null
                    ? channel.dailyViews[date]! > 0
                      ? `+${channel.dailyViews[date]!.toLocaleString()}`
                      : channel.dailyViews[date]!.toLocaleString()
                    : "\u2014"}
                </td>
              ))}
              <td className="py-1.5 px-1 text-right font-mono font-semibold tabular-nums">
                {channel.totalViews > 0
                  ? channel.totalViews.toLocaleString()
                  : "\u2014"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
