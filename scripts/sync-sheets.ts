/**
 * Google Sheets Sync Script — Multi-Tab Edition
 *
 * Reads activity data from MULTIPLE channel-specific tabs in your Google Sheet
 * (Newsletter, YouTube, Socials, LinkedIn, etc.), normalises the different column
 * layouts into one unified `activities` table, and syncs daily_metrics as before.
 *
 * Each tab has its own column names — the script knows how to map them.
 * Only rows with status "Live" or "Booked" are imported (pipeline/prospects are skipped).
 *
 * The sheet must be shared as "Anyone with the link can view".
 * No API keys or OAuth needed — uses the built-in CSV export URL.
 *
 * Usage:  npx tsx scripts/sync-sheets.ts
 *   or:   npm run sync
 *
 * Required env var:  GOOGLE_SHEET_ID
 * Required env var:  ACTIVITY_TABS  (comma-separated list of tab_name:channel pairs)
 * Optional env var:  DAILY_METRICS_TAB_NAME (default: "daily_metrics")
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  metadata: string | null; // JSON string of channel-specific bet metrics
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
// CSV Parsing — handles quoted fields (Google Sheets wraps fields with commas)
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

/** Build a JSON string of metadata, stripping null-valued keys */
function buildMetadata(obj: Record<string, number | null>): string | null {
  const clean: Record<string, number> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val != null) clean[key] = val;
  }
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

// ---------------------------------------------------------------------------
// Date normalisation — your sheets have dates like "2026-01-19 00:00:00"
// ---------------------------------------------------------------------------

function normaliseDate(raw: string): string | null {
  if (!raw || raw.trim() === "" || raw.toLowerCase() === "tbd") return null;

  const trimmed = raw.trim();

  // Handle "2026-01-19 00:00:00" → "2026-01-19"
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // Handle DD/MM/YYYY or DD/MM/YY (e.g. "07/12/2025" or "07/12/25" = 7 Dec 2025)
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    const [, dd, mm, yy] = dmy;
    // Convert 2-digit year to 4-digit (assume 20xx)
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Handle month-only like "Jan 2026", "February 2026" → first of the month
  const monthYear = trimmed.match(
    /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})$/i,
  );
  if (monthYear) {
    const parsed = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  // Handle "Feb 9th 2026", "March 15 2026" or other informal dates — try Date.parse
  // Strip ordinal suffixes first (1st, 2nd, 3rd, 4th, etc.)
  const cleaned = trimmed.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Status normalisation
// ---------------------------------------------------------------------------

function normaliseStatus(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (lower === "live") return "live";
  if (lower === "booked") return "booked";
  if (lower === "canceled" || lower === "cancelled") return "canceled";
  // Skip everything else (Idea, Contacted, Negotiating, Not a fit, etc.)
  return null;
}

// ---------------------------------------------------------------------------
// Channel override for Socials tab — it has a "Channel" column (X, LinkedIn)
// ---------------------------------------------------------------------------

function channelFromSocialsRow(row: Record<string, string>): string | null {
  const ch = (row["Channel"] || "").trim().toLowerCase();
  if (ch === "x" || ch === "twitter") return "x";
  if (ch === "linkedin") return "linkedin";
  if (ch === "tiktok") return "tiktok";
  return null;
}

// ---------------------------------------------------------------------------
// Per-tab column mapping → NormalisedActivity
// ---------------------------------------------------------------------------

/**
 * Newsletter tab columns:
 *   Status | Channel Name | Newsletter URL | ePublish date | USD$ Rate |
 *   Collab Type | Send | Open Rate | Av. views | CTR | Estimated Clics |
 *   Cost per click | CVR (click to meeting) | eNAU | CPA | ...
 */
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
    actualClicks: intOrNull(row["Actual Clicks"]),
    deterministicTrackedSignups: intOrNull(row["eNAU"]),
    notes: (row["Newsletter URL"] || "").trim() || null,
    contentUrl: null,
    channelUrl: null,
    metadata: buildMetadata({
      send: intOrNull(row["Send"]),
      estClicks: intOrNull(row["Estimated Clics"]),
      actualClicks: intOrNull(row["Actual Clicks"]),
      eNAU: intOrNull(row["eNAU"]),
      cpa: floatOrNull(row["CPA"]),
    }),
  };
}

/**
 * YouTube tab columns:
 *   Lise's notes | Campaign | Status | Channel Name | Channel URL | Content URL | Availability |
 *   USD$ Rate | Collab Type | Channel Subscribers | Est. views |
 *   Clicks | Potential users 0.34% conversion | Max budget at $75/user | CPA // rate
 */
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

/**
 * Socials tab columns:
 *   Channel | Status | Channel Name | Social URL | ePublish date |
 *   USD$ Rate | Collab Type | Audience | Engagement rate | ...
 *
 * The "Channel" column contains the actual platform (X, LinkedIn, TikTok).
 * This overrides the default channel from ACTIVITY_TABS.
 */
function mapSocials(
  row: Record<string, string>,
): NormalisedActivity | null {
  const status = normaliseStatus(row["Status"] || "");
  if (!status) return null;

  const partnerName = (row["Channel Name"] || "").trim();
  if (!partnerName) return null;

  // Socials tab may not always have a date yet
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

/**
 * LinkedIn tab columns:
 *   Status | Name | LinkedIn URL | Followers | Est. views per post |
 *   USD$ Rate | Collab Type | ICP category | Note
 *
 * This tab is mostly a prospect list — most rows have no Status or Rate.
 * Only rows with a real Status (Live/Booked) make it through.
 */
function mapLinkedIn(
  row: Record<string, string>,
): NormalisedActivity | null {
  const status = normaliseStatus(row["Status"] || "");
  if (!status) return null;

  const partnerName = (row["Name"] || "").trim();
  if (!partnerName) return null;

  // Try multiple date column variations
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
  // Socials tab has its own channel column that overrides the default
  x: mapSocials,
  linkedin: mapLinkedIn,
};

/**
 * Generic fallback mapper for any tab that follows a reasonable convention.
 * Falls back to common column names.
 */
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  log("Starting Google Sheets sync (multi-tab)...");

  // --- Read config ---
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId || sheetId.trim() === "") {
    logError(
      "GOOGLE_SHEET_ID is not set in .env.\n" +
        "Open the .env file and paste your Google Sheet ID.\n" +
        "The Sheet ID is the long string in your Google Sheets URL between /d/ and /edit.",
    );
    process.exit(1);
  }

  const activityTabsEnv = process.env.ACTIVITY_TABS;
  if (!activityTabsEnv || activityTabsEnv.trim() === "") {
    logError(
      "ACTIVITY_TABS is not set in .env.\n" +
        'Set it to a comma-separated list like: Newsletter:newsletter,YouTube:youtube,Socials:x\n' +
        "Format: TabName:channel",
    );
    process.exit(1);
  }

  const metricsTab = process.env.DAILY_METRICS_TAB_NAME || "daily_metrics";
  const tabConfigs = parseActivityTabs(activityTabsEnv);

  log(`Configured ${tabConfigs.length} activity tabs: ${tabConfigs.map((t) => `${t.tabName} → ${t.channel}`).join(", ")}`);

  // --- Step 1: Fetch all sheets in parallel (fail fast, don't touch DB yet) ---
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
    logError("Database was NOT modified. Existing data is safe.");
    process.exit(1);
  }

  // --- Step 2: Parse daily metrics ---
  // Map from actual sheet column names → internal names
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

  // Normalise channel values to lowercase and map known aliases
  function normaliseMetricChannel(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (lower === "youtube") return "youtube";
    if (lower === "linkedin") return "linkedin";
    if (lower === "x" || lower === "twitter") return "x";
    if (lower === "sponsorship") return "sponsorship";
    if (lower === "newsletter") return "newsletter";
    if (lower === "podcast") return "podcast";
    if (lower === "tiktok") return "tiktok";
    return lower; // pass through unknown channels as-is
  }

  const rawMetricRows = parseCsvRows(metricsCsv);
  const metricRows: Record<string, string>[] = [];

  if (rawMetricRows.length > 0) {
    // Remap columns
    const actualHeaders = Object.keys(rawMetricRows[0]);
    const mappedHeaders = actualHeaders.map((h) => METRIC_COL_MAP[h] || h);
    const required = ["date", "channel", "signups", "activations"];
    const missing = required.filter((r) => !mappedHeaders.includes(r));
    if (missing.length > 0) {
      logError(
        `"${metricsTab}" tab is missing required columns: ${missing.join(", ")}.\n` +
          `Found columns: ${actualHeaders.join(", ")}.\n` +
          `Expected (or mapped from): date, channel, signups, activations.\n` +
          `Check that your Google Sheet header row matches.`,
      );
      logError("Database was NOT modified.");
      process.exit(1);
    }

    for (const raw of rawMetricRows) {
      const mapped: Record<string, string> = {};
      for (const [key, val] of Object.entries(raw)) {
        const normKey = METRIC_COL_MAP[key] || key;
        mapped[normKey] = val;
      }
      // Normalise channel value
      mapped["channel"] = normaliseMetricChannel(mapped["channel"] || "");
      // Normalise date (handle DD/MM/YYYY, etc.)
      const normDate = normaliseDate(mapped["date"] || "");
      if (normDate) {
        mapped["date"] = normDate;
        metricRows.push(mapped);
      }
    }
    log(`  daily_metrics → ${metricRows.length} rows mapped (${rawMetricRows.length} raw, ${rawMetricRows.length - metricRows.length} skipped)`);
  }

  // --- Step 3: Parse and normalise each activity tab ---
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

    log(`  ${config.tabName} → ${imported} activities imported (${rows.length} total rows, ${rows.length - imported} skipped)`);
  }

  log(
    `Parsed ${allActivities.length} activities total, ${metricRows.length} daily metrics.`,
  );

  // --- Step 4: Write to DB inside a transaction ---
  try {
    await prisma.$transaction(async (tx) => {
      // Clear existing data
      await tx.activity.deleteMany();
      await tx.dailyMetric.deleteMany();

      // Insert activities
      for (const act of allActivities) {
        await tx.activity.create({
          data: {
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
          },
        });
      }

      // Insert daily metrics
      for (const row of metricRows) {
        const signups = intOrNull(row["signups"]) ?? 0;
        const activations = intOrNull(row["activations"]) ?? 0;
        await tx.dailyMetric.create({
          data: {
            date: row["date"],
            channel: row["channel"],
            signups,
            activations,
          },
        });
      }
    });
  } catch (err) {
    logError(
      `Database write failed: ${err instanceof Error ? err.message : err}`,
    );
    logError(
      "Transaction rolled back. Your previous data should still be intact.",
    );
    process.exit(1);
  }

  log(
    `Sync complete. Loaded ${allActivities.length} activities and ${metricRows.length} daily metrics.`,
  );
}

main()
  .catch((e) => {
    logError(`Unexpected error: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
