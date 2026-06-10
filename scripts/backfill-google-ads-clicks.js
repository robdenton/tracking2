/**
 * Backfill Google Ads ClickView for the last N days into the google_ads_clicks
 * table. ClickView requires a one-day filter per query and exposes max 90 days
 * of history. We loop over each day, paginate results (page size 10,000), and
 * upsert each GCLID.
 *
 * Run via:
 *   source ~/.google-ads-credentials  (DEVELOPER_TOKEN, CLIENT_ID, CLIENT_SECRET,
 *                                       REFRESH_TOKEN, LOGIN_CUSTOMER_ID, CUSTOMER_ID)
 *   DATABASE_URL=... node scripts/backfill-google-ads-clicks.js [DAYS_BACK]
 *
 * Default DAYS_BACK is 90 (the API limit).
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const DAYS_BACK = parseInt(process.argv[2] || "90", 10);
const PAGE_SIZE = 10000;
const REST_BETWEEN_CALLS_MS = 600;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) return cachedToken;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: process.env.REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Token refresh failed: " + JSON.stringify(j));
  cachedToken = j.access_token;
  cachedTokenExpiresAt = Date.now() + j.expires_in * 1000;
  return cachedToken;
}

const QUERY_TEMPLATE = `
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

async function fetchOneDay(day) {
  const token = await getAccessToken();
  const url = `https://googleads.googleapis.com/v21/customers/${process.env.CUSTOMER_ID}/googleAds:search`;
  const headers = {
    Authorization: "Bearer " + token,
    "developer-token": process.env.DEVELOPER_TOKEN,
    "login-customer-id": process.env.LOGIN_CUSTOMER_ID,
    "Content-Type": "application/json",
  };
  const rows = [];
  let pageToken;
  let page = 1;
  while (true) {
    const body = {
      query: QUERY_TEMPLATE.replace("__DATE__", day),
    };
    if (pageToken) body.pageToken = pageToken;
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(
        `Search failed ${r.status} for ${day} page ${page}: ${txt.slice(0, 300)}`,
      );
    }
    const j = await r.json();
    const got = j.results || [];
    rows.push(...got);
    pageToken = j.nextPageToken;
    process.stdout.write(`    ${day} page ${page}: +${got.length}\n`);
    if (!pageToken) break;
    page++;
    await new Promise((s) => setTimeout(s, REST_BETWEEN_CALLS_MS));
  }
  return rows;
}

function toRow(r) {
  const c = r.clickView || {};
  const camp = r.campaign || {};
  const ag = r.adGroup || {};
  const seg = r.segments || {};
  return {
    gclid: c.gclid,
    clickDate: seg.date,
    customerId: r.customer?.id ?? process.env.CUSTOMER_ID,
    campaignId: camp.id,
    campaignName: camp.name ?? null,
    campaignChannelType: camp.advertisingChannelType ?? null,
    adGroupId: ag.id ?? null,
    adGroupName: ag.name ?? null,
    adGroupAdId: c.adGroupAd ?? null,
    adNetworkType: seg.adNetworkType ?? null,
    device: seg.device ?? null,
    keywordText: seg.keyword?.info?.text ?? c.keywordInfo?.text ?? null,
    keywordMatchType: c.keywordInfo?.matchType ?? null,
    areaOfInterestId: c.areaOfInterest?.country ?? null,
    locationOfPresenceId: c.locationOfPresence?.country ?? null,
    userListId: c.userList ?? null,
    pageNumber: c.pageNumber ? Number(c.pageNumber) : null,
  };
}

(async () => {
  const today = new Date();
  const days = [];
  for (let i = 1; i <= DAYS_BACK; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  console.log(
    `Backfilling Google Ads ClickView for ${days.length} days: ${days[days.length - 1]} → ${days[0]}`,
  );

  let totalInserted = 0,
    totalUpdated = 0,
    totalErr = 0,
    apiCalls = 0;
  const now = new Date();

  for (const day of days) {
    let rows;
    try {
      console.log(`  ${day}:`);
      rows = await fetchOneDay(day);
      apiCalls++;
    } catch (e) {
      console.log(`  ! err fetching ${day}: ${e.message.slice(0, 200)}`);
      totalErr++;
      continue;
    }
    // Bulk insert with skipDuplicates — at 70k rows/day per-row upserts would
    // take hours. ClickView data is immutable (attribution doesn't change),
    // so we don't need to refresh existing rows.
    console.log(`    bulk-inserting ${rows.length} rows...`);
    const records = rows.map(toRow).filter((r) => r.gclid && r.campaignId);
    const BATCH = 1000;
    let inserted = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      try {
        const res = await p.googleAdsClick.createMany({
          data: batch,
          skipDuplicates: true,
        });
        inserted += res.count;
      } catch (e) {
        console.log(`    ! batch err: ${e.message.slice(0, 200)}`);
        totalErr++;
      }
    }
    totalInserted += inserted;
    const skipped = records.length - inserted;
    console.log(
      `    ✓ ${day}: ${inserted} new, ${skipped} already-existed (running total: ${totalInserted} new)`,
    );
    await new Promise((s) => setTimeout(s, REST_BETWEEN_CALLS_MS));
  }

  console.log();
  console.log(
    `Done: ${totalInserted} inserted, ${totalUpdated} updated, ${totalErr} errors over ${apiCalls} API calls`,
  );

  const stats = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*)::int as total,
       COUNT(DISTINCT click_date)::int as distinct_days,
       MIN(click_date) as earliest,
       MAX(click_date) as latest
     FROM google_ads_clicks`,
  );
  console.log(
    "Final DB:",
    JSON.stringify(stats, (k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );

  await p.$disconnect();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
