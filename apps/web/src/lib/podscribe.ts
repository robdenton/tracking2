/**
 * Podscribe API Client
 *
 * The Podscribe API is async:
 *   1. POST a request → get a task ID
 *   2. Poll GET /status/{id} until status="done"
 *   3. Download CSV from the returned URL
 */

const BASE_URL = "https://backend.podscribe.ai";

function getApiKey(): string {
  const key = process.env.PODSCRIBE_API_KEY;
  if (!key) throw new Error("PODSCRIBE_API_KEY is not set");
  return key;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PodscribeRow {
  day: string; // YYYY-MM-DD
  publisher: string;
  campaign: string;
  show: string;
  episode: string;
  publishDate: string;
  impressions: number;
  reach: number;
  spend: number;
  visitors: number;
  visits: number;
  campaignId: string; // Campaign ID (external)
  campaignInternalId: string; // Campaign Internal ID (our unique key)
  type: string; // baked-in | dai
  tags: string;
  expectedDate: string;
  startDate: string;
  endDate: string;
}

// ---------------------------------------------------------------------------
// CSV Parsing — handles quoted fields with commas / newlines
// ---------------------------------------------------------------------------

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1 || current[0] !== "") rows.push(current);
        current = [];
        if (ch === "\r") i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }
  // last field / row
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1 || current[0] !== "") rows.push(current);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Polling helpers
// ---------------------------------------------------------------------------

async function submitImpressionsRequest(
  startDate: string,
  endDate: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/public/impressions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      startDate,
      endDate,
      formatting: { numberFormatting: false },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Podscribe POST /impressions failed (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  const taskId: string | undefined = data.id ?? data.taskId ?? data.task_id;
  if (!taskId) {
    throw new Error(
      `Podscribe: no task ID in response: ${JSON.stringify(data)}`
    );
  }
  return taskId;
}

interface PollResult {
  status: string;
  url?: string;
}

async function pollStatus(taskId: string): Promise<PollResult> {
  const res = await fetch(
    `${BASE_URL}/api/public/file-processor/status/${taskId}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Podscribe poll status failed (${res.status}): ${body}`
    );
  }

  return res.json();
}

async function waitForCompletion(
  taskId: string,
  maxWaitMs = 240_000,
  intervalMs = 5_000
): Promise<string> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const result = await pollStatus(taskId);

    if (result.status === "done") {
      if (!result.url) {
        throw new Error("Podscribe task done but no download URL returned");
      }
      return result.url;
    }

    if (result.status === "error" || result.status === "failed") {
      throw new Error(`Podscribe task ${taskId} failed: ${result.status}`);
    }

    // Wait before polling again
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Podscribe task ${taskId} did not complete within ${maxWaitMs / 1000}s`
  );
}

async function downloadCSV(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to download CSV (${res.status}): ${url}`);
  }
  return res.text();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchImpressionsByDay(
  startDate: string,
  endDate: string
): Promise<PodscribeRow[]> {
  // 1. Submit request
  const taskId = await submitImpressionsRequest(startDate, endDate);

  // 2. Poll until done
  const csvUrl = await waitForCompletion(taskId);

  // 3. Download and parse CSV
  const csvText = await downloadCSV(csvUrl);
  const records = parseCSV(csvText);

  // 4. Map to typed rows
  return records.map((r) => ({
    day: r["Day"] ?? "",
    publisher: r["Publisher"] ?? "",
    campaign: r["Campaign"] ?? "",
    show: r["Show"] ?? "",
    episode: r["Episode"] ?? "",
    publishDate: r["Publish Date"] ?? "",
    impressions: parseInt(r["Podcast & Streaming Impressions"] ?? "0", 10) || 0,
    reach: parseInt(r["Reach"] ?? "0", 10) || 0,
    spend: parseFloat(r["Spend"] ?? "0") || 0,
    visitors: parseFloat(r["Visitors"] ?? "0") || 0,
    visits: parseFloat(r["Visits"] ?? "0") || 0,
    campaignId: r["Campaign ID"] ?? "",
    campaignInternalId: r["Campaign Internal ID"] ?? "",
    type: r["Type"] ?? "",
    tags: r["Tags"] ?? "",
    expectedDate: r["Campaign Expected Date"] ?? "",
    startDate: r["Campaign Start Date"] ?? "",
    endDate: r["Campaign End Date"] ?? "",
  }));
}
