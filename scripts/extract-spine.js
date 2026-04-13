// Extract metrics spine data from production database
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const p = new PrismaClient();

function toDateStr(d) {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d_REPLACE_MARKER;
}

async function run() {
  // 1. LinkedIn Ads daily (campaign-level)
  const liAds = await p.linkedInAdDaily.findMany({
    include: { campaign: true },
    orderBy: { date: "asc" },
  });
  console.log(`LinkedIn Ads daily rows: ${liAds.length}`);

  // 2. Activities (all channels)
  const activities = await p.activity.findMany({
    orderBy: { date: "asc" },
  });
  console.log(`Activities: ${activities.length}`);
  // Check what fields are available
  if (activities.length > 0) {
    console.log("Activity sample keys:", Object.keys(activities[0]).join(", "));
    console.log("Activity sample:", JSON.stringify(activities[0], null, 2));
  }
  const byType = {};
  activities.forEach((a) => {
    byType[a.activityType] = (byType[a.activityType] || 0) + 1;
  });
  console.log("Activities by type:", JSON.stringify(byType));

  // 3. Daily metrics (signups/activations)
  const dailyMetrics = await p.dailyMetric.findMany({
    orderBy: { date: "asc" },
  });
  console.log(`Daily metrics rows: ${dailyMetrics.length}`);

  // 4. Podscribe campaign daily
  const podscribe = await p.podscribeCampaignDaily.findMany({
    include: { campaign: true },
    orderBy: { date: "asc" },
  });
  console.log(`Podscribe daily rows: ${podscribe.length}`);

  // 5. Growi UGC daily
  const growi = await p.growiDailySnapshot.findMany({
    orderBy: { date: "asc" },
  });
  console.log(`Growi daily rows: ${growi.length}`);

  // 6. Dub link daily
  const dub = await p.dubLinkDaily.findMany({
    orderBy: { date: "asc" },
  });
  console.log(`Dub link daily rows: ${dub.length}`);

  // 7. Activity uplifts
  const uplifts = await p.activityUplift.findMany();
  console.log(`Activity uplifts: ${uplifts.length}`);

  // 8. Content views
  const contentViews = await p.contentView.findMany({
    orderBy: { date: "asc" },
  });
  console.log(`Content views: ${contentViews.length}`);

  // 9. LinkedIn ad creatives daily
  const creativeDaily = await p.linkedInAdCreativeDaily.findMany({
    include: { creative: { include: { campaign: true } } },
    orderBy: { date: "asc" },
  });
  console.log(`LinkedIn creative daily rows: ${creativeDaily.length}`);

  // Now build the spine
  const spine = [];

  // --- LinkedIn Ads (campaign-level daily) ---
  for (const row of liAds) {
    const imp = row.impressions || 0;
    const clk = row.clicks || 0;
    const spd = row.spend || 0;
    spine.push({
      date: toDateStr(row.date),
      platform: "linkedin",
      channel: "paid_social",
      account_name: "",
      campaign_id: row.campaign?.campaignUrn || "",
      campaign_name: row.campaign?.name || "",
      adset_id: "",
      adset_name: "",
      ad_id: "",
      ad_name: "",
      creative_id: "",
      creative_name: "",
      landing_page: "",
      geo: "",
      device: "",
      currency: "USD",
      spend: spd,
      impressions: imp,
      reach: "",
      frequency: "",
      clicks: clk,
      link_clicks: row.landingPageClicks || "",
      ctr: imp > 0 ? (clk / imp).toFixed(6) : "",
      cpc: clk > 0 ? (spd / clk).toFixed(4) : "",
      video_views: "",
      video_view_rate: "",
      completed_views: "",
      listen_starts: "",
      completed_listens: "",
      sessions: "",
      accounts_created: "",
      new_activated_users: "",
      conversion_value: "",
      source_file: "linkedin_ad_daily",
      source_grain: "campaign",
      attribution_notes: "LinkedIn Ads API; conversions use LinkedIn 30-day click-through window",
      data_confidence: "high",
      notes: `conversions=${row.conversions || 0}; reactions=${row.reactions || 0}; comments=${row.comments || 0}; shares=${row.shares || 0}`,
    });
  }

  // --- Podscribe (podcast campaign daily) ---
  for (const row of podscribe) {
    const imp = row.impressions || 0;
    const spd = row.spend || 0;
    spine.push({
      date: toDateStr(row.date),
      platform: "podscribe",
      channel: "audio",
      account_name: "",
      campaign_id: row.campaign?.campaignId || "",
      campaign_name: row.campaign?.name || "",
      adset_id: "",
      adset_name: row.campaign?.show || "",
      ad_id: "",
      ad_name: "",
      creative_id: "",
      creative_name: "",
      landing_page: "",
      geo: "",
      device: "",
      currency: "USD",
      spend: spd,
      impressions: imp,
      reach: row.reach || "",
      frequency: "",
      clicks: "",
      link_clicks: "",
      ctr: "",
      cpc: "",
      video_views: "",
      video_view_rate: "",
      completed_views: "",
      listen_starts: imp,
      completed_listens: "",
      sessions: "",
      accounts_created: "",
      new_activated_users: "",
      conversion_value: "",
      source_file: "podscribe_campaign_daily",
      source_grain: "campaign",
      attribution_notes: "Podscribe pixel-based attribution; impressions = verified listens",
      data_confidence: "high",
      notes: `publisher=${row.campaign?.publisher || ""}; visitors=${row.visitors || 0}; visits=${row.visits || 0}`,
    });
  }

  // --- Activities (newsletter, YouTube, socials, LinkedIn organic, podcast manual) ---
  // Build uplift map
  const upliftMap = {};
  for (const u of uplifts) {
    upliftMap[u.activityId] = u;
  }

  // Build content view map (aggregate per activity)
  const cvMap = {};
  for (const cv of contentViews) {
    if (!cvMap[cv.activityId]) cvMap[cv.activityId] = 0;
    cvMap[cv.activityId] += cv.viewCount || 0;
  }

  for (const act of activities) {
    const dateStr = toDateStr(act.date);
    let platform, channel;
    const ch = act.channel?.toLowerCase() || "";
    if (ch === "newsletter") {
      platform = "newsletter";
      channel = "newsletter";
    } else if (ch === "youtube") {
      platform = "youtube";
      channel = "video";
    } else if (ch === "podcast") {
      platform = "podscribe";
      channel = "audio";
    } else if (ch === "linkedin") {
      platform = "linkedin";
      channel = "paid_social";
    } else if (ch === "x" || ch === "socials") {
      platform = "other";
      channel = "paid_social";
    } else {
      platform = "other";
      channel = "other";
    }

    const uplift = upliftMap[act.id] || {};
    const cost = act.costUsd || 0;
    const clicks = act.deterministicClicks || act.actualClicks || 0;
    const views = cvMap[act.id] || 0;

    spine.push({
      date: dateStr,
      platform,
      channel,
      account_name: act.partnerName || "",
      campaign_id: act.id,
      campaign_name: `${act.activityType}: ${act.partnerName || ""} ${dateStr}`.trim(),
      adset_id: "",
      adset_name: "",
      ad_id: "",
      ad_name: "",
      creative_id: "",
      creative_name: "",
      landing_page: act.contentUrl || "",
      geo: "",
      device: "",
      currency: "USD",
      spend: cost,
      impressions: views || "",
      reach: "",
      frequency: "",
      clicks: clicks,
      link_clicks: act.deterministicClicks || "",
      ctr: views > 0 && clicks > 0 ? (clicks / views).toFixed(6) : "",
      cpc: clicks > 0 && cost > 0 ? (cost / clicks).toFixed(4) : "",
      video_views: ch === "youtube" ? views : "",
      video_view_rate: "",
      completed_views: "",
      listen_starts: "",
      completed_listens: "",
      sessions: "",
      accounts_created: uplift.rawIncrementalSignups != null ? Math.round(uplift.rawIncrementalSignups) : "",
      new_activated_users: uplift.rawIncrementalActivations != null ? Math.round(uplift.rawIncrementalActivations) : "",
      conversion_value: "",
      source_file: "activities + activity_uplifts",
      source_grain: "campaign",
      attribution_notes: `${act.activityType} activity; incremental = post-window minus baseline; attributed=${uplift.attributedIncrementalSignups != null ? Math.round(uplift.attributedIncrementalSignups) : "n/a"}`,
      data_confidence: uplift.confidence || "medium",
      notes: `channel=${act.channel || ""}; status=${act.status || ""}; tag=${act.tag || ""}; source=${act.source || ""}`,
    });
  }

  // --- Growi UGC daily ---
  for (const row of growi) {
    spine.push({
      date: toDateStr(row.date),
      platform: "other",
      channel: "influencer",
      account_name: "Growi UGC",
      campaign_id: "",
      campaign_name: "",
      adset_id: "",
      adset_name: "",
      ad_id: "",
      ad_name: "",
      creative_id: "",
      creative_name: "",
      landing_page: "",
      geo: "",
      device: "",
      currency: "USD",
      spend: "",
      impressions: row.views || 0,
      reach: "",
      frequency: "",
      clicks: "",
      link_clicks: "",
      ctr: "",
      cpc: "",
      video_views: row.views || 0,
      video_view_rate: "",
      completed_views: "",
      listen_starts: "",
      completed_listens: "",
      sessions: "",
      accounts_created: "",
      new_activated_users: "",
      conversion_value: "",
      source_file: "growi_daily_snapshots",
      source_grain: "daily_total",
      attribution_notes: "Growi UGC aggregate; no spend or conversion tracking",
      data_confidence: "medium",
      notes: `likes=${row.likes || 0}; comments=${row.comments || 0}; shares=${row.shares || 0}; saves=${row.saves || 0}; posts=${row.postsCount || 0}; tiktok_views=${row.tiktokViews || 0}; ig_views=${row.instagramViews || 0}`,
    });
  }

  // --- Daily metrics as product KPIs (daily_total grain) ---
  // Aggregate by date across channels
  const dmByDate = {};
  for (const dm of dailyMetrics) {
    const d = toDateStr(dm.date);
    if (!dmByDate[d]) dmByDate[d] = { signups: 0, activations: 0 };
    dmByDate[d].signups += dm.signups || 0;
    dmByDate[d].activations += dm.activations || 0;
  }

  for (const [dateStr, totals] of Object.entries(dmByDate)) {
    spine.push({
      date: dateStr,
      platform: "other",
      channel: "product",
      account_name: "",
      campaign_id: "",
      campaign_name: "",
      adset_id: "",
      adset_name: "",
      ad_id: "",
      ad_name: "",
      creative_id: "",
      creative_name: "",
      landing_page: "",
      geo: "",
      device: "",
      currency: "",
      spend: "",
      impressions: "",
      reach: "",
      frequency: "",
      clicks: "",
      link_clicks: "",
      ctr: "",
      cpc: "",
      video_views: "",
      video_view_rate: "",
      completed_views: "",
      listen_starts: "",
      completed_listens: "",
      sessions: "",
      accounts_created: totals.signups,
      new_activated_users: totals.activations,
      conversion_value: "",
      source_file: "daily_metrics",
      source_grain: "daily_total",
      attribution_notes: "Product-level daily totals; not attributed to any campaign/platform",
      data_confidence: "high",
      notes: "",
    });
  }

  // Sort: date asc, then platform, then campaign_name
  spine.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.platform !== b.platform) return a.platform < b.platform ? -1 : 1;
    return (a.campaign_name || "").localeCompare(b.campaign_name || "");
  });

  // Write CSV
  const headers = [
    "date","platform","channel","account_name","campaign_id","campaign_name",
    "adset_id","adset_name","ad_id","ad_name","creative_id","creative_name",
    "landing_page","geo","device","currency","spend","impressions","reach",
    "frequency","clicks","link_clicks","ctr","cpc","video_views",
    "video_view_rate","completed_views","listen_starts","completed_listens",
    "sessions","accounts_created","new_activated_users","conversion_value",
    "source_file","source_grain","attribution_notes","data_confidence","notes"
  ];

  const csvRows = [headers.join(",")];
  for (const row of spine) {
    const vals = headers.map((h) => {
      let v = row[h];
      if (v === null || v === undefined) v = "";
      v = String(v);
      // Escape CSV
      if (v.includes(",") || v.includes('"') || v.includes("\n")) {
        v = '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    });
    csvRows.push(vals.join(","));
  }

  fs.writeFileSync("metrics_spine.csv", csvRows.join("\n"), "utf-8");
  console.log(`\nWrote metrics_spine.csv with ${spine.length} rows`);

  // Print summary stats for QA
  console.log("\n=== QA SUMMARY ===");
  const platforms = {};
  let totalSpend = 0, totalImp = 0, totalClicks = 0;
  let missingSpend = 0, missingImp = 0, missingClicks = 0, missingAC = 0, missingNAU = 0;
  for (const row of spine) {
    const plat = row.platform;
    if (!platforms[plat]) platforms[plat] = { rows: 0, spend: 0, impressions: 0, clicks: 0 };
    platforms[plat].rows++;
    platforms[plat].spend += Number(row.spend) || 0;
    platforms[plat].impressions += Number(row.impressions) || 0;
    platforms[plat].clicks += Number(row.clicks) || 0;
    totalSpend += Number(row.spend) || 0;
    totalImp += Number(row.impressions) || 0;
    totalClicks += Number(row.clicks) || 0;
    if (row.spend === "" || row.spend === 0) missingSpend++;
    if (row.impressions === "" || row.impressions === 0) missingImp++;
    if (row.clicks === "" || row.clicks === 0) missingClicks++;
    if (row.accounts_created === "") missingAC++;
    if (row.new_activated_users === "") missingNAU++;
  }

  console.log("\nBy platform:");
  for (const [plat, stats] of Object.entries(platforms)) {
    console.log(`  ${plat}: ${stats.rows} rows, spend=$${stats.spend.toFixed(2)}, imp=${stats.impressions}, clicks=${stats.clicks}`);
  }
  console.log(`\nTotals: spend=$${totalSpend.toFixed(2)}, impressions=${totalImp}, clicks=${totalClicks}`);
  console.log(`\nMissingness (out of ${spine.length} rows):`);
  console.log(`  spend: ${missingSpend} (${(missingSpend/spine.length*100).toFixed(1)}%)`);
  console.log(`  impressions: ${missingImp} (${(missingImp/spine.length*100).toFixed(1)}%)`);
  console.log(`  clicks: ${missingClicks} (${(missingClicks/spine.length*100).toFixed(1)}%)`);
  console.log(`  accounts_created: ${missingAC} (${(missingAC/spine.length*100).toFixed(1)}%)`);
  console.log(`  new_activated_users: ${missingNAU} (${(missingNAU/spine.length*100).toFixed(1)}%)`);

  // Check for duplicates
  const seen = new Set();
  let dupes = 0;
  for (const row of spine) {
    const key = `${row.date}|${row.platform}|${row.campaign_id}|${row.ad_id}|${row.source_file}`;
    if (seen.has(key) && row.campaign_id) dupes++;
    seen.add(key);
  }
  console.log(`\nDuplicate detection: ${dupes} potential duplicates (same date+platform+campaign_id+ad_id+source_file)`);

  // Anomalies
  let spendNoImp = 0, highCtr = 0;
  for (const row of spine) {
    const spd = Number(row.spend) || 0;
    const imp = Number(row.impressions) || 0;
    const ctr = Number(row.ctr) || 0;
    if (spd > 0 && imp === 0) spendNoImp++;
    if (ctr > 0.5) highCtr++;
  }
  console.log(`\nAnomalies:`);
  console.log(`  spend > 0 with 0 impressions: ${spendNoImp}`);
  console.log(`  CTR > 50%: ${highCtr}`);

  // Date range
  const dates = spine.map(r => r.date).sort();
  console.log(`\nDate range: ${dates[0]} to ${dates[dates.length - 1]}`);
}

run()
  .then(() => p.$disconnect())
  .catch((e) => {
    console.error(e);
    p.$disconnect();
    process.exit(1);
  });
