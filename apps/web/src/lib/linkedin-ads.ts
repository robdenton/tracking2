/**
 * LinkedIn Marketing API client
 *
 * Wraps LinkedIn's REST API for ad account management and analytics.
 * Uses 3-legged OAuth 2.0 with scopes r_ads + r_ads_reporting.
 *
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
 */

const LINKEDIN_API_BASE = "https://api.linkedin.com";
const LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2";
const API_VERSION = "202503"; // YYYYMM format

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientId(): string {
  const id = process.env.LINKEDIN_ADS_CLIENT_ID?.trim();
  if (!id) throw new Error("LINKEDIN_ADS_CLIENT_ID is not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.LINKEDIN_ADS_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("LINKEDIN_ADS_CLIENT_SECRET is not set");
  return secret;
}

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// OAuth 2.0
// ---------------------------------------------------------------------------

/**
 * Build the LinkedIn OAuth authorization URL.
 * The user will be redirected here to grant access.
 */
export function getAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: redirectUri,
    state,
    scope: "r_ads r_ads_reporting",
  });
  return `${LINKEDIN_AUTH_BASE}/authorization?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}> {
  const res = await fetch(`${LINKEDIN_AUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `LinkedIn token exchange failed (${res.status}): ${body}`
    );
  }

  return res.json();
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}> {
  const res = await fetch(`${LINKEDIN_AUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `LinkedIn token refresh failed (${res.status}): ${body}`
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Ad Accounts
// ---------------------------------------------------------------------------

export interface LinkedInAdAccount {
  id: string; // numeric ID
  urn: string; // "urn:li:sponsoredAccount:123456"
  name: string;
  status: string;
  currency: string;
}

/**
 * List all ad accounts the authenticated user has access to.
 */
export async function getAdAccounts(
  accessToken: string
): Promise<LinkedInAdAccount[]> {
  const url = `${LINKEDIN_API_BASE}/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&count=100`;
  const res = await fetch(url, { headers: apiHeaders(accessToken) });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `LinkedIn getAdAccounts failed (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  const elements: Array<Record<string, unknown>> = data.elements ?? [];

  return elements.map((el) => {
    const id = String(el.id ?? "");
    return {
      id,
      urn: `urn:li:sponsoredAccount:${id}`,
      name: String(el.name ?? ""),
      status: String(el.status ?? ""),
      currency: String(el.currency ?? ""),
    };
  });
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface LinkedInCampaign {
  id: string;
  urn: string;
  name: string;
  status: string;
  type?: string;
  costType?: string;
  dailyBudget?: number;
  totalBudget?: number;
  campaignGroupUrn?: string;
}

/**
 * List all campaigns for a given ad account.
 */
export async function getCampaigns(
  accessToken: string,
  accountUrn: string
): Promise<LinkedInCampaign[]> {
  const all: LinkedInCampaign[] = [];
  let start = 0;
  const count = 100;

  // Extract numeric account ID from URN for nested URL
  const accountId = accountUrn.split(":").pop();

  while (true) {
    const url =
      `${LINKEDIN_API_BASE}/rest/adAccounts/${accountId}/adCampaigns?q=search` +
      `&start=${start}&count=${count}`;

    const res = await fetch(url, { headers: apiHeaders(accessToken) });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `LinkedIn getCampaigns failed (${res.status}): ${body}`
      );
    }

    const data = await res.json();
    const elements: Array<Record<string, unknown>> = data.elements ?? [];

    for (const el of elements) {
      const id = String(el.id ?? "");
      all.push({
        id,
        urn: `urn:li:sponsoredCampaign:${id}`,
        name: String(el.name ?? ""),
        status: String(el.status ?? ""),
        type: el.type ? String(el.type) : undefined,
        costType: el.costType ? String(el.costType) : undefined,
        dailyBudget: parseBudget(el.dailyBudget),
        totalBudget: parseBudget(el.totalBudget),
        campaignGroupUrn: el.campaignGroup
          ? String(el.campaignGroup)
          : undefined,
      });
    }

    if (elements.length < count) break;
    start += count;
    await sleep(200);
  }

  return all;
}

function parseBudget(budget: unknown): number | undefined {
  if (!budget || typeof budget !== "object") return undefined;
  const b = budget as Record<string, unknown>;
  // LinkedIn returns { amount: "100.00", currencyCode: "USD" }
  const amount = b.amount ?? b.value;
  if (amount === undefined || amount === null) return undefined;
  const parsed = parseFloat(String(amount));
  return isNaN(parsed) ? undefined : parsed;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface LinkedInAdAnalyticsRow {
  campaignUrn: string;
  date: string; // YYYY-MM-DD
  impressions: number;
  clicks: number;
  costInLocalCurrency: number;
  landingPageClicks: number;
  reactions: number;
  comments: number;
  shares: number;
  follows: number;
  conversions: number;
}

/**
 * Fetch daily ad analytics for an account, pivoted by campaign.
 * Returns one row per campaign per day.
 */
export async function getAnalytics(
  accessToken: string,
  accountUrn: string,
  dateRange: { start: string; end: string } // "YYYY-MM-DD"
): Promise<LinkedInAdAnalyticsRow[]> {
  const [startYear, startMonth, startDay] = dateRange.start
    .split("-")
    .map(Number);
  const [endYear, endMonth, endDay] = dateRange.end.split("-").map(Number);

  // LinkedIn versioned API uses RestLI parenthesis format for structured params
  const url =
    `${LINKEDIN_API_BASE}/rest/adAnalytics?q=analytics` +
    `&pivot=CAMPAIGN` +
    `&timeGranularity=DAILY` +
    `&dateRange=(start:(year:${startYear},month:${startMonth},day:${startDay}),end:(year:${endYear},month:${endMonth},day:${endDay}))` +
    `&accounts=List(${encodeURIComponent(accountUrn)})` +
    `&fields=impressions,clicks,costInLocalCurrency,landingPageClicks,likes,comments,shares,follows,externalWebsiteConversions,dateRange,pivotValues`;

  const res = await fetch(url, { headers: apiHeaders(accessToken) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `LinkedIn getAnalytics failed (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  const elements: Array<Record<string, unknown>> = data.elements ?? [];

  return elements.map((el) => {
    const dr = el.dateRange as Record<
      string,
      Record<string, number>
    > | null;
    const start = dr?.start;
    const dateStr = start
      ? `${start.year}-${String(start.month).padStart(2, "0")}-${String(start.day).padStart(2, "0")}`
      : "";

    // pivotValues is an array like ["urn:li:sponsoredCampaign:123"]
    const pivotValues = el.pivotValues as string[] | undefined;
    const campaignUrn = pivotValues?.[0] ?? String(el.pivotValue ?? "");

    return {
      campaignUrn,
      date: dateStr,
      impressions: Number(el.impressions ?? 0),
      clicks: Number(el.clicks ?? 0),
      costInLocalCurrency: parseFloat(String(el.costInLocalCurrency ?? "0")),
      landingPageClicks: Number(el.landingPageClicks ?? 0),
      reactions: Number(el.likes ?? 0),
      comments: Number(el.comments ?? 0),
      shares: Number(el.shares ?? 0),
      follows: Number(el.follows ?? 0),
      conversions: Number(el.externalWebsiteConversions ?? 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
