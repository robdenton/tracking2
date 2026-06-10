/**
 * Google Ads API client — Search Recent ClickView for daily click-level data.
 *
 * Env vars required:
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID — the MCC (Manager) customer ID
 *   GOOGLE_ADS_CUSTOMER_ID       — the actual ads account to query
 *
 * Docs: https://developers.google.com/google-ads/api/fields/v21/click_view
 *
 * ClickView constraints:
 *  - WHERE segments.date must be a single day (no ranges)
 *  - Max 90 days of history
 *  - Fixed page size of 10,000 results
 */

const BASE = "https://googleads.googleapis.com/v21";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Google OAuth refresh failed (${r.status}): ${body.slice(0, 300)}`);
  }
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: j.access_token,
    expiresAt: Date.now() + j.expires_in * 1000,
  };
  return cachedToken.token;
}

const CLICKVIEW_QUERY = `
SELECT
  click_view.gclid,
  click_view.ad_group_ad,
  click_view.area_of_interest.country,
  click_view.location_of_presence.country,
  click_view.user_list,
  click_view.page_number,
  click_view.keyword_info.match_type,
  click_view.keyword,
  customer.id,
  campaign.id,
  campaign.name,
  campaign.advertising_channel_type,
  ad_group.id,
  ad_group.name,
  segments.device,
  segments.ad_network_type,
  segments.date
FROM click_view
WHERE segments.date = '__DATE__'
`.trim();

export interface ClickViewRow {
  clickView?: {
    gclid?: string;
    adGroupAd?: string;
    areaOfInterest?: { country?: string };
    locationOfPresence?: { country?: string };
    userList?: string;
    pageNumber?: string;
    keywordInfo?: { matchType?: string };
    keyword?: string;
  };
  customer?: { id?: string };
  campaign?: {
    id?: string;
    name?: string;
    advertisingChannelType?: string;
  };
  adGroup?: { id?: string; name?: string };
  segments?: { device?: string; adNetworkType?: string; date?: string };
}

/** Fetch a single page of ClickView results for a specific day. */
async function fetchPage(
  day: string,
  pageToken?: string
): Promise<{ rows: ClickViewRow[]; nextPageToken?: string }> {
  const token = await getAccessToken();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || "";
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "";
  if (!customerId) throw new Error("GOOGLE_ADS_CUSTOMER_ID not set");

  const body: { query: string; pageToken?: string } = {
    query: CLICKVIEW_QUERY.replace("__DATE__", day),
  };
  if (pageToken) body.pageToken = pageToken;

  const r = await fetch(`${BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
      "login-customer-id": loginCustomerId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(
      `ClickView fetch failed (${r.status}) for ${day}: ${txt.slice(0, 300)}`
    );
  }
  const j = (await r.json()) as {
    results?: ClickViewRow[];
    nextPageToken?: string;
  };
  return { rows: j.results ?? [], nextPageToken: j.nextPageToken };
}

/**
 * Fetch every ClickView row for one day, paginating through all 10k-result
 * pages until exhausted. Returns the full list.
 */
export async function fetchClickViewForDay(
  day: string,
  opts: { delayMs?: number } = {}
): Promise<ClickViewRow[]> {
  const delayMs = opts.delayMs ?? 250;
  const all: ClickViewRow[] = [];
  let pageToken: string | undefined;
  let pageNum = 0;
  while (true) {
    pageNum++;
    const { rows, nextPageToken } = await fetchPage(day, pageToken);
    all.push(...rows);
    if (!nextPageToken) break;
    pageToken = nextPageToken;
    if (delayMs > 0) {
      await new Promise((s) => setTimeout(s, delayMs));
    }
    // safety cap: if a day has more than 200 pages (~2M rows), something is up
    if (pageNum > 250) {
      throw new Error(`Page cap exceeded for ${day} (>${pageNum} pages)`);
    }
  }
  return all;
}

/** Flatten a raw API row to the columns we store in `google_ads_clicks`. */
export function clickViewToRow(r: ClickViewRow) {
  const c = r.clickView || {};
  const camp = r.campaign || {};
  const ag = r.adGroup || {};
  const seg = r.segments || {};
  return {
    gclid: c.gclid ?? "",
    clickDate: seg.date ?? "",
    customerId: r.customer?.id ?? process.env.GOOGLE_ADS_CUSTOMER_ID ?? "",
    campaignId: camp.id ?? "",
    campaignName: camp.name ?? null,
    campaignChannelType: camp.advertisingChannelType ?? null,
    adGroupId: ag.id ?? null,
    adGroupName: ag.name ?? null,
    adGroupAdId: c.adGroupAd ?? null,
    adNetworkType: seg.adNetworkType ?? null,
    device: seg.device ?? null,
    keywordText: null as string | null, // segments.keyword.info.text not allowed with click_view
    keywordMatchType: c.keywordInfo?.matchType ?? null,
    areaOfInterestId: c.areaOfInterest?.country ?? null,
    locationOfPresenceId: c.locationOfPresence?.country ?? null,
    userListId: c.userList ?? null,
    pageNumber: c.pageNumber ? Number(c.pageNumber) : null,
  };
}
