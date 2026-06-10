/**
 * Joins granola_users to google_ads_clicks via gclid and reports how
 * much paid-acquisition attribution we recovered for users who didn't
 * have UTMs at signup.
 *
 * Run AFTER:
 *   - Google Ads ClickView 90-day backfill is done
 *   - granola_users CSV has been imported
 *
 *   DATABASE_URL=... node scripts/attribution-recovery-report.js
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

function n(v) {
  return v === null || v === undefined ? "—" : Number(v).toLocaleString();
}

(async () => {
  // 1. Coverage stats
  const coverage = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*)::int as total_users,
       COUNT(*) FILTER (WHERE gclid IS NOT NULL)::int as has_gclid,
       COUNT(*) FILTER (WHERE utm_source IS NOT NULL)::int as has_utm,
       COUNT(*) FILTER (WHERE gclid IS NOT NULL AND utm_source IS NULL)::int as gclid_no_utm,
       COUNT(*) FILTER (WHERE gclid IS NOT NULL AND utm_source IS NOT NULL)::int as gclid_and_utm
     FROM granola_users`,
  );
  console.log("=== User coverage ===");
  console.log(JSON.stringify(coverage[0], null, 2));

  // 2. How many of the "GCLID but no UTM" users do we find in google_ads_clicks?
  const recovery = await p.$queryRawUnsafe(
    `SELECT
       COUNT(*)::int as recoverable_users,
       COUNT(*) FILTER (WHERE c.gclid IS NOT NULL)::int as matched_in_clicks,
       COUNT(*) FILTER (WHERE c.gclid IS NULL)::int as unmatched
     FROM granola_users u
     LEFT JOIN google_ads_clicks c ON c.gclid = u.gclid
     WHERE u.gclid IS NOT NULL AND u.utm_source IS NULL`,
  );
  console.log();
  console.log("=== Attribution recovery (gclid-only users) ===");
  console.log(JSON.stringify(recovery[0], null, 2));
  if (recovery[0].recoverable_users > 0) {
    const pct = (
      (recovery[0].matched_in_clicks / recovery[0].recoverable_users) *
      100
    ).toFixed(1);
    console.log(`Match rate: ${pct}%`);
  }

  // 3. Top campaigns that acquired previously-unattributed users
  const byCampaign = await p.$queryRawUnsafe(
    `SELECT
       c.campaign_name,
       c.campaign_channel_type,
       COUNT(*)::int as users_attributed
     FROM granola_users u
     INNER JOIN google_ads_clicks c ON c.gclid = u.gclid
     WHERE u.gclid IS NOT NULL AND u.utm_source IS NULL
     GROUP BY c.campaign_name, c.campaign_channel_type
     ORDER BY users_attributed DESC
     LIMIT 25`,
  );
  console.log();
  console.log("=== Top campaigns acquiring GCLID-only users ===");
  console.log(
    `${"channel".padEnd(18)} ${"users".padStart(7)}  campaign`,
  );
  for (const r of byCampaign) {
    console.log(
      `${(r.campaign_channel_type ?? "—").padEnd(18)} ${String(r.users_attributed).padStart(7)}  ${r.campaign_name ?? "—"}`,
    );
  }

  // 4. Cross-check: when a user has BOTH gclid AND utm_source, does the
  // GCLID-attributed channel agree with the UTM source?
  const agreement = await p.$queryRawUnsafe(
    `SELECT
       u.utm_source,
       c.campaign_channel_type as gclid_channel,
       COUNT(*)::int as n
     FROM granola_users u
     INNER JOIN google_ads_clicks c ON c.gclid = u.gclid
     WHERE u.gclid IS NOT NULL AND u.utm_source IS NOT NULL
     GROUP BY u.utm_source, c.campaign_channel_type
     ORDER BY n DESC
     LIMIT 20`,
  );
  console.log();
  console.log("=== Cross-check: utm_source vs GCLID-attributed channel ===");
  console.log(
    `${"utm_source".padEnd(25)} ${"gclid_channel".padEnd(20)} ${"count".padStart(7)}`,
  );
  for (const r of agreement) {
    console.log(
      `${(r.utm_source ?? "—").padEnd(25)} ${(r.gclid_channel ?? "—").padEnd(20)} ${String(r.n).padStart(7)}`,
    );
  }

  // 5. Channel breakdown of recovered users
  const byChannel = await p.$queryRawUnsafe(
    `SELECT
       c.campaign_channel_type,
       COUNT(DISTINCT u.user_id)::int as users
     FROM granola_users u
     INNER JOIN google_ads_clicks c ON c.gclid = u.gclid
     WHERE u.gclid IS NOT NULL AND u.utm_source IS NULL
     GROUP BY c.campaign_channel_type
     ORDER BY users DESC`,
  );
  console.log();
  console.log("=== Channel breakdown of recovered users ===");
  for (const r of byChannel) {
    console.log(
      `  ${(r.campaign_channel_type ?? "—").padEnd(18)} ${String(r.users).padStart(7)} users`,
    );
  }

  await p.$disconnect();
})().catch((e) => {
  console.error("CRASH:", e.message);
  process.exit(1);
});
