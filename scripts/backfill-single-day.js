/**
 * Fetch Google Ads ClickView for a single specific date.
 *   source ~/.google-ads-credentials
 *   DATABASE_URL=... node scripts/backfill-single-day.js YYYY-MM-DD
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const TARGET = process.argv[2];
if (!TARGET || !/^\d{4}-\d{2}-\d{2}$/.test(TARGET)) {
  console.error("Usage: node backfill-single-day.js YYYY-MM-DD");
  process.exit(1);
}

async function getAccessToken() {
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
  return j.access_token;
}

const QUERY = (date) => `
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
WHERE segments.date = '${date}'
`.trim();

// Same shape as the working backfill script — camelCase Prisma fields.
function flatten(row) {
  const c = row.clickView || {};
  const camp = row.campaign || {};
  const ag = row.adGroup || {};
  const seg = row.segments || {};
  return {
    gclid: c.gclid,
    clickDate: seg.date,
    customerId: row.customer?.id ?? process.env.CUSTOMER_ID,
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
  const token = await getAccessToken();
  const customerId = process.env.CUSTOMER_ID;

  let pageToken = null,
    pageCount = 0;
  const all = [];

  while (true) {
    pageCount++;
    const body = { query: QUERY(TARGET) };
    if (pageToken) body.pageToken = pageToken;
    const r = await fetch(
      `https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "developer-token": process.env.DEVELOPER_TOKEN,
          "login-customer-id": process.env.LOGIN_CUSTOMER_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const j = await r.json();
    if (!r.ok) {
      console.error("API err:", JSON.stringify(j).slice(0, 500));
      process.exit(1);
    }
    const rows = j.results || [];
    for (const row of rows) all.push(flatten(row));
    if (pageCount % 10 === 0)
      console.log(`  page ${pageCount}, total so far: ${all.length}`);
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`Fetched ${all.length} clicks for ${TARGET}. Inserting (1000-row batches)...`);
  let inserted = 0,
    batches = 0;
  for (let i = 0; i < all.length; i += 1000) {
    const chunk = all.slice(i, i + 1000);
    try {
      const r = await p.googleAdsClick.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      inserted += r.count;
      batches++;
      if (batches % 100 === 0)
        console.log(`  inserted ${inserted} / ${all.length}`);
    } catch (e) {
      console.error("Insert err on batch " + batches + ":", e.message?.slice(0, 200));
      process.exit(1);
    }
  }
  console.log(`Done: ${inserted} new (${all.length - inserted} duplicates)`);
  await p.$disconnect();
})().catch((e) => {
  console.error("CRASH:", e.message);
  process.exit(1);
});
