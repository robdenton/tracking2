/**
 * Compact number formatting: 1,200,000 → "1.2M", 20,000 → "20K", 232 → "232"
 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

/**
 * Channel-specific bet metric labels.
 * Keys match the metadata keys set by each sync mapper.
 */
const CHANNEL_BET_LABELS: Record<string, [string, string][]> = {
  newsletter: [
    ["send", "send"],
    ["estClicks", "est. clicks"],
    ["cpa", "CPA"],
  ],
  youtube: [
    ["subscribers", "subs"],
    ["estViews", "est. views"],
  ],
  podcast: [
    ["estDownloads", "est. downloads"],
  ],
  x: [
    ["audience", "audience"],
    ["avViews", "av. views"],
  ],
  linkedin: [
    ["followers", "followers"],
    ["estViews", "est. views"],
  ],
};

/**
 * Build a compact inline summary for the homepage table.
 * e.g. "20K send · 232 clicks · $1.10 CPA"
 */
export function formatBetSummary(
  channel: string,
  metadata: Record<string, number> | null,
): string {
  if (!metadata) return "—";

  const labels = CHANNEL_BET_LABELS[channel];
  if (!labels) {
    // Unknown channel — show all metadata keys
    const parts = Object.entries(metadata).map(
      ([key, val]) => `${formatCompact(val)} ${key}`,
    );
    return parts.join(" · ") || "—";
  }

  const parts: string[] = [];
  for (const [key, label] of labels) {
    const val = metadata[key];
    if (val == null) continue;
    if (label === "CPA") {
      parts.push(`$${val.toFixed(2)} ${label}`);
    } else {
      parts.push(`${formatCompact(val)} ${label}`);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

/**
 * Get the full label map for a channel (used on detail page).
 */
export function getBetLabels(
  channel: string,
): [string, string][] {
  return CHANNEL_BET_LABELS[channel] || [];
}

/**
 * Format a single bet metric value for display.
 */
export function formatBetValue(key: string, value: number): string {
  if (key === "cpa") return `$${value.toFixed(2)}`;
  return formatCompact(value);
}

/**
 * Calculate estimated CPC (Cost Per Click) for newsletters
 * @returns Estimated CPC or null if not calculable
 */
export function calculateEstimatedCPC(activity: {
  costUsd: number | null;
  deterministicClicks: number | null;
}): number | null {
  if (
    activity.costUsd != null &&
    activity.deterministicClicks != null &&
    activity.deterministicClicks > 0
  ) {
    return activity.costUsd / activity.deterministicClicks;
  }
  return null;
}

/**
 * Calculate actual CPC (Cost Per Click) for newsletters
 * @returns Actual CPC or null if not calculable
 */
export function calculateActualCPC(activity: {
  costUsd: number | null;
  actualClicks: number | null;
}): number | null {
  if (
    activity.costUsd != null &&
    activity.actualClicks != null &&
    activity.actualClicks > 0
  ) {
    return activity.costUsd / activity.actualClicks;
  }
  return null;
}

/**
 * Format CPC value for display
 */
export function formatCPC(cpc: number | null): string {
  if (cpc == null) return "—";
  return `$${cpc.toFixed(2)}`;
}

/**
 * Calculate CPA (Cost Per Acquisition) based on incremental signups
 * @returns CPA or null if not calculable
 */
export function calculateCPA(activity: {
  costUsd: number | null;
  incremental: number;
}): number | null {
  if (
    activity.costUsd != null &&
    activity.incremental > 0
  ) {
    return activity.costUsd / activity.incremental;
  }
  return null;
}

/**
 * Format CPA value for display
 */
export function formatCPA(cpa: number | null): string {
  if (cpa == null) return "—";
  return `$${cpa.toFixed(2)}`;
}
