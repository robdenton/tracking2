"use client";

import { useState } from "react";
import { ChannelTable } from "./ChannelTable";
import { VideoTable } from "./VideoTable";

interface ChannelRow {
  channelTitle: string;
  videoCount: number;
  paidCount: number;
  totalViews: number;
  dailyViews: Record<string, number | null>;
}

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

type View = "channels" | "videos";

export function YouTubeTableToggle({
  channels,
  videos,
  dates,
}: {
  channels: ChannelRow[];
  videos: VideoRow[];
  dates: string[];
}) {
  const [view, setView] = useState<View>("channels");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {view === "channels" ? "Channels" : "Videos"}
        </h2>
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 text-xs overflow-hidden">
          <button
            onClick={() => setView("channels")}
            className={`px-3 py-1.5 transition-colors ${
              view === "channels"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setView("videos")}
            className={`px-3 py-1.5 transition-colors ${
              view === "videos"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Videos
          </button>
        </div>
      </div>

      {view === "channels" ? (
        <ChannelTable channels={channels} dates={dates} />
      ) : (
        <VideoTable videos={videos} dates={dates} />
      )}
    </div>
  );
}
