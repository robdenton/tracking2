/**
 * Shared Prisma → core type mappers.
 * Used by both data.ts (read path) and recompute-attribution.ts (write path)
 * to avoid duplicating the same mapping logic.
 */

import type { Activity, DailyMetric } from "@mai/core";

/** Map a Prisma Activity row to the core Activity type */
export function toActivity(row: {
  id: string;
  activityType: string;
  channel: string;
  partnerName: string;
  date: string;
  status: string;
  costUsd: number | null;
  deterministicClicks: number | null;
  actualClicks: number | null;
  deterministicTrackedSignups: number | null;
  notes: string | null;
  metadata: string | null;
  contentUrl: string | null;
  channelUrl: string | null;
}): Activity {
  let metadata: Record<string, number> | null = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = null;
    }
  }
  return {
    id: row.id,
    activityType: row.activityType,
    channel: row.channel,
    partnerName: row.partnerName,
    date: row.date,
    status: row.status,
    costUsd: row.costUsd,
    deterministicClicks: row.deterministicClicks,
    actualClicks: row.actualClicks,
    deterministicTrackedSignups: row.deterministicTrackedSignups,
    notes: row.notes,
    metadata,
    contentUrl: row.contentUrl,
    channelUrl: row.channelUrl,
  };
}

/** Map a Prisma DailyMetric row to the core DailyMetric type */
export function toDailyMetric(row: {
  date: string;
  channel: string;
  signups: number;
  activations: number;
}): DailyMetric {
  return {
    date: row.date,
    channel: row.channel,
    signups: row.signups,
    activations: row.activations,
  };
}
