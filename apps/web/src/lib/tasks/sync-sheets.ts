/**
 * Google Sheets Sync Task Module
 *
 * Extracted from scripts/sync-sheets.ts for use in Vercel Cron Jobs.
 * Reads activity data from multiple channel-specific tabs in Google Sheet,
 * normalizes the different column layouts, and syncs to database.
 *
 * Only rows with status "Live" or "Booked" are imported.
 * The sheet must be shared as "Anyone with the link can view".
 */

import { prisma } from "../prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NormalisedActivity {
  activityType: string;
  channel: string;
  partnerName: string;
  date: string; // YYYY-MM-DD
  status: string; // live, booked, canceled
  costUsd: number | null;
  deterministicClicks: number | null;
  actualClicks: number | null;
  deterministicTrackedSignups: number | null;
  notes: string | null;
  metadata: string | null; // JSON string of channel-specific metrics
  contentUrl: string | null;
  channelUrl: string | null;
}

interface TabConfig {
  tabName: string;
  channel: string;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += ch;
      i++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        fields.push(current.trim());
        current = "";
        i++;
        continue;
      }
      current += ch;
      i++;
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseCsvRows(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function intOrNull(val: string | undefined): number | null {
  if (!val || val === "") return null;
  const cleaned = val.replace(/[,$]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

function floatOrNull(val: string | undefined): number | null {
  if (!val || val === "" || val === "-") return null;
  const cleaned = val.replace(/[,$]/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function buildMetadata(obj: Record<string, number | null>): string | null {
  const clean: Record<string, number> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val != null) clean[key] = val;
  }
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

// ---------------------------------------------------------------------------
// Date normalization
// ---------------------------------------------------------------------------

function normaliseDate(raw: string): string | null {
  if (!raw || raw.trim() === "" || raw.toLowerCase() === "tbd") return null;

  const trimmed = raw.trim();

  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    const [, dd, mm, yy] = dmy;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const monthYear = trimmed.match(
    /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})$/i,
  );
  if (monthYear) {
    const parsed = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  const cleaned = trimmed.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Status normalization
// ---------------------------------------------------------------------------

function normaliseStatus(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (lower === "live") return "live";
  if (lower === "booked") return "booked";
  if (lower === "canceled" || lower === "cancelled") return "canceled";
  return null;
}

// ---------------------------------------------------------------------------
// Channel override for Socials tab
// ---------------------------------------------------------------------------

function channelFromSocialsRow(row: Record<string, string>): string | null {
  const ch = (row["Channel"] || "").trim().toLowerCase();
  if (ch === "x" || ch === "twitter") return "x";
  if (ch === "linkedin") return "linkedin";
  if (ch === "tiktok") return "tiktok";
  return null;
}

// ---------------------------------------------------------------------------
// Per-tab column mapping
// ---------------------------------------------------------------------------

function mapNewsletter(
  row: Record<string, string>,
): NormalisedActivity | null {
  const status = normaliseStatus(row["Status"] || "");
  if (!status) return null;

  const date = normaliseDate(row["ePublish date"] || "");
  if (!date) return null;

  const partnerName = (row["Channel Name"] || "").trim();
  if (!partnerName) return null;

  return {
    activityType: (row["Collab Type"] || "newsletter_ad").trim(),
    channel: "newsletter",
    partnerName,
    date,
    status,
    costUsd: floatOrNull(row["USD$ Rate"]),
    deterministicClicks: intOrNull(row["Estimated Clics"]),
    actualClicks: intOrNull(row["Actual clicks"]),
    deterministicTrackedSignups: intOrNull(row["eNAU"]),
    notes: (row["Newsletter URL"] || "").trim() || null,
    contentUrl: null,
    channelUrl: null,
    metadata: buildMetadata({
      send: intOrNull(row["Send"]),
      estClicks: intOrNull(row["Estimated Clics"]),
      actualClicks: intOrNull(row["Actual clicks"]),
      eNAU: intOrNull(row["eNAU"]),
      cpa: floatOrNull(row["CPA"]),
    }),
  };
}

function mapYouTube(
  row: Record<string, string>,
): NormalisedActivity | null {
  const status = normaliseStatus(row["Status"] || "");
  if (!status) return null;

  const date = normaliseDate(row["Availability"] || "");
  if (!date) return null;

  const partnerName = (row["Channel Name"] || "").trim();
  if (!partnerName) return null;

  return {
    activityType: (row["Collab Type"] || "youtube_video").trim(),
    channel: "youtube",
    partnerName,
    date,
    status,
    costUsd: floatOrNull(row["USD$ Rate"]),
    deterministicClicks: intOrNull(row["Clicks"]),
    actualClicks: null,
    deterministicTrackedSignups: null,
    notes: (row["Campaign"] || "").trim() || null,
    contentUrl: (row["Content URL"] || "").trim() || null,
    channelUrl: (row["Channel URL"] || "").trim() || null,
    metadata: buildMetadata({
      subscribers: intOrNull(row["Channel Subscribers"]),
      estViews: intOrNull(row["Est. views"] || row["Est. views "]),
      cpa: floatOrNull(row["CPA // rate"]),
    }),
  };
}

function mapSocials(
  row: Record<string, string>,
): NormalisedActivity | null {
  const status = normaliseStatus(row["Status"] || "");
  if (!status) return null;

  const partnerName = (row["Channel Name"] || "").trim();
  if (!partnerName) return null;

  const date = normaliseDate(row["ePublish date"] || "");
  if (!date) return null;

  const channel = channelFromSocialsRow(row);
  if (!channel) return null;

  return {
    activityType: (row["Collab Type"] || "social_post").trim(),
    channel,
    partnerName,
    date,
    status,
    costUsd: floatOrNull(row["USD$ Rate"]),
    deterministicClicks: intOrNull(row["Estimated Clics"]),
    actualClicks: null,
    deterministicTrackedSignups: intOrNull(row["eNAU"]),
    notes: (row["Social URL"] || "").trim() || null,
    contentUrl: null,
    channelUrl: null,
    metadata: buildMetadata({
      audience: intOrNull(row["Audience"]),
      avViews: intOrNull(row["Av. views"]),
    }),
  };
}

function mapLinkedIn(
  row: Record<string, string>,
): NormalisedActivity | null {
  const status = normaliseStatus(row["Status"] || "");
  if (!status) return null;

  const partnerName = (row["Name"] || "").trim();
  if (!partnerName) return null;

  const date = normaliseDate(
    row["Date going live"] || row["Date"] || row["ePublish date"] || ""
  );
  if (!date) return null;

  return {
    activityType: (row["Collab Type"] || "linkedin_post").trim(),
    channel: "linkedin",
    partnerName,
    date,
    status,
    costUsd: floatOrNull(row["USD$ Rate"]),
    deterministicClicks: null,
    actualClicks: null,
    deterministicTrackedSignups: null,
    notes: (row["Note"] || "").trim() || null,
    contentUrl: (row["Content URL"] || row["Content Link"] || row["LinkedIn URL"] || "").trim() || null,
    channelUrl: (row["LinkedIn URL"] || "").trim() || null,
    metadata: buildMetadata({
      followers: intOrNull(row["Followers"]),
      estViews: intOrNull(row["Est. views per post"]),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tab mapper registry
// ---------------------------------------------------------------------------

type TabMapper = (row: Record<string, string>) => NormalisedActivity | null;

const TAB_MAPPERS: Record<string, TabMapper> = {
  newsletter: mapNewsletter,
  youtube: mapYouTube,
  x: mapSocials,
  linkedin: mapLinkedIn,
};

function mapGeneric(
  row: Record<string, string>,
  defaultChannel: string,
): NormalisedActivity | null {
  const status = normaliseStatus(
    row["Status"] || row["status"] || "",
  );
  if (!status) return null;

  const partnerName = (
    row["Channel Name"] || row["Name"] || row["partner_name"] || ""
  ).trim();
  if (!partnerName) return null;

  const date = normaliseDate(
    row["ePublish date"] ||
    row["Availability"] ||
    row["date"] ||
    row["Date going live"] ||
    "",
  );
  if (!date) return null;

  return {
    activityType: (
      row["Collab Type"] || row["activity_type"] || "unknown"
    ).trim(),
    channel: defaultChannel,
    partnerName,
    date,
    status,
    costUsd: floatOrNull(row["USD$ Rate"] || row["cost_usd"]),
    deterministicClicks: intOrNull(
      row["Estimated Clics"] || row["Clicks"] || row["deterministic_clicks"],
    ),
    actualClicks: null,
    deterministicTrackedSignups: intOrNull(
      row["eNAU"] || row["deterministic_tracked_signups"],
    ),
    notes: null,
    contentUrl: (row["Content URL"] || row["content_url"] || "").trim() || null,
    channelUrl: (row["Channel URL"] || row["channel_url"] || "").trim() || null,
    metadata: null,
  };
}

// ---------------------------------------------------------------------------
// Fetch from Google Sheets
// ---------------------------------------------------------------------------

function buildCsvUrl(sheetId: string, tabName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

async function fetchSheetCsv(
  sheetId: string,
  tabName: string,
): Promise<string> {
  const url = buildCsvUrl(sheetId, tabName);
  log(`Fetching "${tabName}" tab...`);

  const response = await fetch(url);

  if (!response.ok) {
    const status = response.status;
    let hint = "";
    if (status === 404) {
      hint =
        'Check that GOOGLE_SHEET_ID is correct and the sheet is shared as "Anyone with the link can view".';
    } else if (status === 400) {
      hint = `Check that a tab named "${tabName}" exists in your Google Sheet.`;
    }
    throw new Error(
      `Failed to fetch "${tabName}" (HTTP ${status}). ${hint}\nURL: ${url}`,
    );
  }

  return response.text();
}

// ---------------------------------------------------------------------------
// Parse ACTIVITY_TABS env var
// ---------------------------------------------------------------------------

function parseActivityTabs(envValue: string): TabConfig[] {
  return envValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const colonIdx = entry.lastIndexOf(":");
      if (colonIdx <= 0) {
        throw new Error(
          `Invalid ACTIVITY_TABS entry: "${entry}". Expected format: "TabName:channel"`,
        );
      }
      return {
        tabName: entry.slice(0, colonIdx).trim(),
        channel: entry.slice(colonIdx + 1).trim().toLowerCase(),
      };
    });
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncGoogleSheets(): Promise<{
  activitiesCount: number;
  metricsCount: number;
}> {
  log("Starting Google Sheets sync (multi-tab)...");

  // --- Read config ---
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId || sheetId.trim() === "") {
    throw new Error(
      "GOOGLE_SHEET_ID is not set in environment variables. " +
      "The Sheet ID is the long string in your Google Sheets URL between /d/ and /edit."
    );
  }

  const activityTabsEnv = process.env.ACTIVITY_TABS;
  if (!activityTabsEnv || activityTabsEnv.trim() === "") {
    throw new Error(
      "ACTIVITY_TABS is not set in environment variables. " +
      'Expected format: Newsletter:newsletter,YouTube:youtube,Socials:x'
    );
  }

  const metricsTab = process.env.DAILY_METRICS_TAB_NAME || "daily_metrics";
  const tabConfigs = parseActivityTabs(activityTabsEnv);

  log(`Configured ${tabConfigs.length} activity tabs: ${tabConfigs.map((t) => `${t.tabName} → ${t.channel}`).join(", ")}`);

  // --- Step 1: Fetch all sheets in parallel ---
  let metricsCsv: string;
  let tabCsvs: { config: TabConfig; csv: string }[];

  try {
    const [metricsResult, ...tabResults] = await Promise.all([
      fetchSheetCsv(sheetId, metricsTab),
      ...tabConfigs.map(async (config) => ({
        config,
        csv: await fetchSheetCsv(sheetId, config.tabName),
      })),
    ]);
    metricsCsv = metricsResult;
    tabCsvs = tabResults;
  } catch (err) {
    logError(`Fetch failed: ${err instanceof Error ? err.message : err}`);
    throw err;
  }

  // --- Step 2: Parse daily metrics ---
  const METRIC_COL_MAP: Record<string, string> = {
    "Date": "date",
    "date": "date",
    "Channel Group": "channel",
    "channel": "channel",
    "Total Account Created Extrapolated": "signups",
    "signups": "signups",
    "Total Au Desktop Extrapolated": "activations",
    "activations": "activations",
  };

  function normaliseMetricChannel(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (lower === "youtube") return "youtube";
    if (lower === "linkedin") return "linkedin";
    if (lower === "x" || lower === "twitter") return "x";
    if (lower === "sponsorship") return "sponsorship";
    if (lower === "newsletter") return "newsletter";
    if (lower === "podcast") return "podcast";
    if (lower === "tiktok") return "tiktok";
    return lower;
  }

  const rawMetricRows = parseCsvRows(metricsCsv);
  const metricRows: Record<string, string>[] = [];

  if (rawMetricRows.length > 0) {
    const actualHeaders = Object.keys(rawMetricRows[0]);
    const mappedHeaders = actualHeaders.map((h) => METRIC_COL_MAP[h] || h);
    const required = ["date", "channel", "signups", "activations"];
    const missing = required.filter((r) => !mappedHeaders.includes(r));
    if (missing.length > 0) {
      throw new Error(
        `"${metricsTab}" tab is missing required columns: ${missing.join(", ")}. ` +
        `Found columns: ${actualHeaders.join(", ")}.`
      );
    }

    for (const raw of rawMetricRows) {
      const mapped: Record<string, string> = {};
      for (const [key, val] of Object.entries(raw)) {
        const normKey = METRIC_COL_MAP[key] || key;
        mapped[normKey] = val;
      }
      mapped["channel"] = normaliseMetricChannel(mapped["channel"] || "");
      const normDate = normaliseDate(mapped["date"] || "");
      if (normDate) {
        mapped["date"] = normDate;
        metricRows.push(mapped);
      }
    }
    log(`  daily_metrics → ${metricRows.length} rows mapped`);
  }

  // --- Step 3: Parse and normalize each activity tab ---
  const allActivities: NormalisedActivity[] = [];

  for (const { config, csv } of tabCsvs) {
    const rows = parseCsvRows(csv);
    const mapper = TAB_MAPPERS[config.channel];
    let imported = 0;

    for (const row of rows) {
      let activity: NormalisedActivity | null = null;

      if (mapper) {
        activity = mapper(row);
      } else {
        activity = mapGeneric(row, config.channel);
      }

      if (activity) {
        allActivities.push(activity);
        imported++;
      }
    }

    log(`  ${config.tabName} → ${imported} activities imported`);
  }

  log(
    `Parsed ${allActivities.length} activities total, ${metricRows.length} daily metrics.`,
  );

  // --- Step 4: Write to DB inside a transaction ---
  // Use createMany for bulk inserts (4 queries instead of 555+) to avoid
  // Prisma interactive-transaction timeouts on Vercel serverless.
  try {
    await prisma.$transaction(async (tx) => {
      // Clear existing data
      await tx.activity.deleteMany();
      await tx.dailyMetric.deleteMany();

      // Bulk-insert activities
      await tx.activity.createMany({
        data: allActivities.map((act) => ({
          activityType: act.activityType,
          channel: act.channel,
          partnerName: act.partnerName,
          date: act.date,
          status: act.status,
          costUsd: act.costUsd,
          deterministicClicks: act.deterministicClicks,
          actualClicks: act.actualClicks,
          deterministicTrackedSignups: act.deterministicTrackedSignups,
          notes: act.notes,
          metadata: act.metadata,
          contentUrl: act.contentUrl,
          channelUrl: act.channelUrl,
        })),
      });

      // Bulk-insert daily metrics
      await tx.dailyMetric.createMany({
        data: metricRows.map((row) => ({
          date: row["date"],
          channel: row["channel"],
          signups: intOrNull(row["signups"]) ?? 0,
          activations: intOrNull(row["activations"]) ?? 0,
        })),
      });
    });
  } catch (err) {
    logError(
      `Database write failed: ${err instanceof Error ? err.message : err}`,
    );
    throw err;
  }

  log(
    `Sync complete. Loaded ${allActivities.length} activities and ${metricRows.length} daily metrics.`,
  );

  return {
    activitiesCount: allActivities.length,
    metricsCount: metricRows.length,
  };
}
