"use client";

import { useState } from "react";
import { PublisherTable } from "./publisher-table";
import { ActivityTable } from "@/app/components/ActivityTable";
import type { ActivityReport } from "@mai/core";

interface PublisherRow {
  partnerName: string;
  activityCount: number;
  totalClicks: number;
  totalSpend: number;
  incrementalSignups: number;
  incrementalActivations: number;
  incrementalActivationsAllDevices: number;
  ubIncrSignups: number;
  ubIncrActivations: number;
  ubIncrActivationsAll: number;
  cpc: number | null;
  incrementalCpa: number | null;
}

type View = "publishers" | "activities";

export function NewsletterTableToggle({
  publishers,
  reports,
  selectedChannel,
  clickConversionAvg,
  dubClicksMap,
}: {
  publishers: PublisherRow[];
  reports: ActivityReport[];
  selectedChannel: string;
  clickConversionAvg?: number;
  dubClicksMap?: Record<string, { dubClicks: number; dubLeads: number; shortLink: string }>;
}) {
  const [view, setView] = useState<View>("publishers");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {view === "publishers" ? "Publisher Performance" : "Activity Detail"}
        </h2>
        <div className="flex rounded-md border border-border-light text-xs overflow-hidden">
          <button
            onClick={() => setView("publishers")}
            className={`px-3 py-1.5 transition-colors ${
              view === "publishers"
                ? "bg-accent-light text-accent-strong"
                : "text-text-secondary hover:bg-surface-sunken"
            }`}
          >
            Publishers
          </button>
          <button
            onClick={() => setView("activities")}
            className={`px-3 py-1.5 transition-colors ${
              view === "activities"
                ? "bg-accent-light text-accent-strong"
                : "text-text-secondary hover:bg-surface-sunken"
            }`}
          >
            Activities
          </button>
        </div>
      </div>

      {view === "publishers" ? (
        <PublisherTable publishers={publishers} />
      ) : (
        <ActivityTable
          reports={reports}
          selectedChannel={selectedChannel}
          clickConversionAvg={clickConversionAvg}
          dubClicksMap={dubClicksMap}
          showTagColumn
        />
      )}
    </div>
  );
}
