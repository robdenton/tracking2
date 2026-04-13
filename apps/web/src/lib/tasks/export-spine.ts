import { prisma } from "@/lib/prisma";

interface SpineRow {
  date: string;
  platform: string;
  channel: string;
  account_name: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  creative_id: string;
  creative_name: string;
  landing_page: string;
  geo: string;
  device: string;
  currency: string;
  spend: number | string;
  impressions: number | string;
  reach: number | string;
  frequency: number | string;
  clicks: number | string;
  link_clicks: number | string;
  ctr: number | string;
  cpc: number | string;
  video_views: number | string;
  video_view_rate: number | string;
  completed_views: number | string;
  listen_starts: number | string;
  completed_listens: number | string;
  sessions: number | string;
  accounts_created: number | string;
  new_activated_users: number | string;
  conversion_value: number | string;
  source_file: string;
  source_grain: string;
  attribution_notes: string;
  data_confidence: string;
  notes: string;
}

const HEADERS: (keyof SpineRow)[] = [
  "date", "platform", "channel", "account_name", "campaign_id", "campaign_name",
  "adset_id", "adset_name", "ad_id", "ad_name", "creative_id", "creative_name",
  "landing_page", "geo", "device", "currency", "spend", "impressions", "reach",
  "frequency", "clicks", "link_clicks", "ctr", "cpc", "video_views",
  "video_view_rate", "completed_views", "listen_starts", "completed_listens",
  "sessions", "accounts_created", "new_activated_users", "conversion_value",
  "source_file", "source_grain", "attribution_notes", "data_confidence", "notes",
];

function toDateStr(d: string | Date | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function csvEscape(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export interface SpineExportResult {
  rowCount: number;
  platforms: Record<string, number>;
  dateRange: { from: string; to: string };
  csv: string;
}

export async function exportSpine(): Promise<SpineExportResult> {
  // Query all data sources in parallel
  const [liAds, activities, dailyMetrics, podscribe, growi, uplifts, contentViews] =
    await Promise.all([
      prisma.linkedInAdDaily.findMany({ include: { campaign: true }, orderBy: { date: "asc" } }),
      prisma.activity.findMany({ orderBy: { date: "asc" } }),
      prisma.dailyMetric.findMany({ orderBy: { date: "asc" } }),
      prisma.podscribeCampaignDaily.findMany({ include: { campaign: true }, orderBy: { date: "asc" } }),
      prisma.growiDailySnapshot.findMany({ orderBy: { date: "asc" } }),
      prisma.activityUplift.findMany(),
      prisma.contentView.findMany({ orderBy: { date: "asc" } }),
    ]);

  const spine: SpineRow[] = [];

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
      adset_id: "", adset_name: "", ad_id: "", ad_name: "",
      creative_id: "", creative_name: "", landing_page: "",
      geo: "", device: "",
      currency: "USD",
      spend: spd,
      impressions: imp,
      reach: "", frequency: "",
      clicks: clk,
      link_clicks: row.landingPageClicks || "",
      ctr: imp > 0 ? (clk / imp).toFixed(6) : "",
      cpc: clk > 0 ? (spd / clk).toFixed(4) : "",
      video_views: "", video_view_rate: "", completed_views: "",
      listen_starts: "", completed_listens: "", sessions: "",
      accounts_created: "", new_activated_users: "", conversion_value: "",
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
      adset_id: "", adset_name: row.campaign?.show || "",
      ad_id: "", ad_name: "", creative_id: "", creative_name: "",
      landing_page: "", geo: "", device: "",
      currency: "USD",
      spend: spd,
      impressions: imp,
      reach: row.reach || "", frequency: "",
      clicks: "", link_clicks: "", ctr: "", cpc: "",
      video_views: "", video_view_rate: "", completed_views: "",
      listen_starts: imp, completed_listens: "", sessions: "",
      accounts_created: "", new_activated_users: "", conversion_value: "",
      source_file: "podscribe_campaign_daily",
      source_grain: "campaign",
      attribution_notes: "Podscribe pixel-based attribution; impressions = verified listens",
      data_confidence: "high",
      notes: `publisher=${row.campaign?.publisher || ""}; visitors=${row.visitors || 0}; visits=${row.visits || 0}`,
    });
  }

  // --- Activities (newsletter, YouTube, socials, LinkedIn organic, podcast manual) ---
  const upliftMap: Record<string, (typeof uplifts)[number]> = {};
  for (const u of uplifts) upliftMap[u.activityId] = u;

  const cvMap: Record<string, number> = {};
  for (const cv of contentViews) {
    cvMap[cv.activityId] = (cvMap[cv.activityId] || 0) + (cv.viewCount || 0);
  }

  for (const act of activities) {
    const dateStr = toDateStr(act.date);
    let platform: string, channel: string;
    const ch = act.channel?.toLowerCase() || "";
    if (ch === "newsletter") { platform = "newsletter"; channel = "newsletter"; }
    else if (ch === "youtube") { platform = "youtube"; channel = "video"; }
    else if (ch === "podcast") { platform = "podscribe"; channel = "audio"; }
    else if (ch === "linkedin") { platform = "linkedin"; channel = "paid_social"; }
    else if (ch === "x" || ch === "socials") { platform = "other"; channel = "paid_social"; }
    else { platform = "other"; channel = "other"; }

    const uplift = upliftMap[act.id] || ({} as Record<string, unknown>);
    const cost = act.costUsd || 0;
    const clicks = act.deterministicClicks || act.actualClicks || 0;
    const views = cvMap[act.id] || 0;

    spine.push({
      date: dateStr,
      platform, channel,
      account_name: act.partnerName || "",
      campaign_id: act.id,
      campaign_name: `${act.activityType}: ${act.partnerName || ""} ${dateStr}`.trim(),
      adset_id: "", adset_name: "", ad_id: "", ad_name: "",
      creative_id: "", creative_name: "",
      landing_page: act.contentUrl || "",
      geo: "", device: "",
      currency: "USD",
      spend: cost,
      impressions: views || "",
      reach: "", frequency: "",
      clicks,
      link_clicks: act.deterministicClicks || "",
      ctr: views > 0 && clicks > 0 ? (clicks / views).toFixed(6) : "",
      cpc: clicks > 0 && cost > 0 ? (cost / clicks).toFixed(4) : "",
      video_views: ch === "youtube" ? views : "",
      video_view_rate: "", completed_views: "",
      listen_starts: "", completed_listens: "", sessions: "",
      accounts_created: uplift.rawIncrementalSignups != null ? Math.round(uplift.rawIncrementalSignups) : "",
      new_activated_users: uplift.rawIncrementalActivations != null ? Math.round(uplift.rawIncrementalActivations) : "",
      conversion_value: "",
      source_file: "activities + activity_uplifts",
      source_grain: "campaign",
      attribution_notes: `${act.activityType} activity; incremental = post-window minus baseline; attributed=${uplift.attributedIncrementalSignups != null ? Math.round(uplift.attributedIncrementalSignups) : "n/a"}`,
      data_confidence: (uplift.confidence as string) || "medium",
      notes: `channel=${act.channel || ""}; status=${act.status || ""}; tag=${act.tag || ""}; source=${act.source || ""}`,
    });
  }

  // --- Growi UGC daily ---
  for (const row of growi) {
    spine.push({
      date: toDateStr(row.date),
      platform: "other", channel: "influencer",
      account_name: "Growi UGC",
      campaign_id: "", campaign_name: "",
      adset_id: "", adset_name: "", ad_id: "", ad_name: "",
      creative_id: "", creative_name: "", landing_page: "",
      geo: "", device: "",
      currency: "USD",
      spend: "",
      impressions: row.views || 0,
      reach: "", frequency: "",
      clicks: "", link_clicks: "", ctr: "", cpc: "",
      video_views: row.views || 0,
      video_view_rate: "", completed_views: "",
      listen_starts: "", completed_listens: "", sessions: "",
      accounts_created: "", new_activated_users: "", conversion_value: "",
      source_file: "growi_daily_snapshots",
      source_grain: "daily_total",
      attribution_notes: "Growi UGC aggregate; no spend or conversion tracking",
      data_confidence: "medium",
      notes: `likes=${row.likes || 0}; comments=${row.comments || 0}; shares=${row.shares || 0}; saves=${row.saves || 0}; posts=${row.postsCount || 0}; tiktok_views=${row.tiktokViews || 0}; ig_views=${row.instagramViews || 0}`,
    });
  }

  // --- Daily metrics as product KPIs (daily_total grain) ---
  const dmByDate: Record<string, { signups: number; activations: number }> = {};
  for (const dm of dailyMetrics) {
    const d = toDateStr(dm.date);
    if (!dmByDate[d]) dmByDate[d] = { signups: 0, activations: 0 };
    dmByDate[d].signups += dm.signups || 0;
    dmByDate[d].activations += dm.activations || 0;
  }

  for (const [dateStr, totals] of Object.entries(dmByDate)) {
    spine.push({
      date: dateStr,
      platform: "other", channel: "product",
      account_name: "", campaign_id: "", campaign_name: "",
      adset_id: "", adset_name: "", ad_id: "", ad_name: "",
      creative_id: "", creative_name: "", landing_page: "",
      geo: "", device: "", currency: "",
      spend: "", impressions: "", reach: "", frequency: "",
      clicks: "", link_clicks: "", ctr: "", cpc: "",
      video_views: "", video_view_rate: "", completed_views: "",
      listen_starts: "", completed_listens: "", sessions: "",
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

  // Build CSV
  const csvRows = [HEADERS.join(",")];
  for (const row of spine) {
    csvRows.push(HEADERS.map((h) => csvEscape(row[h])).join(","));
  }
  const csv = csvRows.join("\n");

  // Compute summary
  const platforms: Record<string, number> = {};
  for (const row of spine) {
    platforms[row.platform] = (platforms[row.platform] || 0) + 1;
  }
  const dates = spine.map((r) => r.date).filter(Boolean).sort();

  return {
    rowCount: spine.length,
    platforms,
    dateRange: { from: dates[0] || "", to: dates[dates.length - 1] || "" },
    csv,
  };
}
