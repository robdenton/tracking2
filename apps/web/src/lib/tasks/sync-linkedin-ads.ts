/**
 * LinkedIn Ads Sync Task
 *
 * Fetches campaign metadata and daily analytics from the LinkedIn Marketing API
 * and stores them in the linkedin_ad_campaigns / linkedin_ad_daily tables.
 *
 * Requires a LinkedInAdsConnection record in the DB (created via OAuth flow).
 * If the access token has expired, attempts to refresh it automatically.
 */

import { prisma } from "../prisma";
import {
  getCampaigns,
  getAnalytics,
  refreshAccessToken,
} from "../linkedin-ads";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] [LinkedIn Ads Sync] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] [LinkedIn Ads Sync] ERROR: ${msg}`);
}

export async function syncLinkedInAds(): Promise<{
  campaigns: number;
  analytics: number;
  errors: number;
  errorDetail?: string;
}> {
  // 1. Get connection from DB
  const connection = await prisma.linkedInAdsConnection.findFirst();
  if (!connection) {
    logError("No LinkedIn Ads connection found — please connect via OAuth first");
    return {
      campaigns: 0,
      analytics: 0,
      errors: 0,
      errorDetail: "No connection",
    };
  }

  if (!connection.adAccountId) {
    logError("No ad account ID set on connection");
    return {
      campaigns: 0,
      analytics: 0,
      errors: 0,
      errorDetail: "No ad account selected",
    };
  }

  // 2. Check token expiry and refresh if needed
  let accessToken = connection.accessToken;

  if (connection.expiresAt < new Date()) {
    log("Access token expired, attempting refresh...");

    if (!connection.refreshToken) {
      logError("Token expired and no refresh token available — re-auth needed");
      return {
        campaigns: 0,
        analytics: 0,
        errors: 1,
        errorDetail: "Token expired, no refresh token",
      };
    }

    try {
      const refreshed = await refreshAccessToken(connection.refreshToken);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

      await prisma.linkedInAdsConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? connection.refreshToken,
          expiresAt: newExpiry,
        },
      });

      log("Token refreshed successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError(`Token refresh failed: ${msg}`);
      return {
        campaigns: 0,
        analytics: 0,
        errors: 1,
        errorDetail: `Token refresh failed: ${msg}`,
      };
    }
  }

  const accountUrn = connection.adAccountId;
  let campaignCount = 0;
  let analyticsCount = 0;
  let errors = 0;

  // 3. Sync campaigns
  try {
    log(`Fetching campaigns for ${accountUrn}...`);
    const campaigns = await getCampaigns(accessToken, accountUrn);
    log(`Found ${campaigns.length} campaigns`);

    for (const c of campaigns) {
      try {
        await prisma.linkedInAdCampaign.upsert({
          where: { campaignUrn: c.urn },
          create: {
            campaignUrn: c.urn,
            name: c.name,
            status: c.status,
            type: c.type ?? null,
            costType: c.costType ?? null,
            dailyBudget: c.dailyBudget ?? null,
            totalBudget: c.totalBudget ?? null,
            campaignGroupId: c.campaignGroupUrn ?? null,
          },
          update: {
            name: c.name,
            status: c.status,
            type: c.type ?? null,
            costType: c.costType ?? null,
            dailyBudget: c.dailyBudget ?? null,
            totalBudget: c.totalBudget ?? null,
            campaignGroupId: c.campaignGroupUrn ?? null,
          },
        });
        campaignCount++;
      } catch (err) {
        logError(`Failed to upsert campaign ${c.urn}: ${err}`);
        errors++;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Failed to fetch campaigns: ${msg}`);
    return {
      campaigns: campaignCount,
      analytics: 0,
      errors: errors + 1,
      errorDetail: `Campaign fetch failed: ${msg}`,
    };
  }

  // 4. Sync daily analytics for the last 90 days
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    log(`Fetching analytics ${fmt(startDate)} → ${fmt(endDate)}...`);
    const rows = await getAnalytics(accessToken, accountUrn, {
      start: fmt(startDate),
      end: fmt(endDate),
    });
    log(`Received ${rows.length} analytics rows`);

    // Need to resolve campaign URN → campaign DB ID
    const campaignMap = new Map<string, string>();
    const allCampaigns = await prisma.linkedInAdCampaign.findMany({
      select: { id: true, campaignUrn: true },
    });
    for (const c of allCampaigns) {
      campaignMap.set(c.campaignUrn, c.id);
    }

    for (const row of rows) {
      const campaignId = campaignMap.get(row.campaignUrn);
      if (!campaignId) {
        // Campaign not in our DB yet — skip (shouldn't happen after step 3)
        continue;
      }

      try {
        await prisma.linkedInAdDaily.upsert({
          where: {
            campaignId_date: {
              campaignId,
              date: row.date,
            },
          },
          create: {
            campaignId,
            date: row.date,
            impressions: row.impressions,
            clicks: row.clicks,
            spend: row.costInLocalCurrency,
            landingPageClicks: row.landingPageClicks,
            reactions: row.reactions,
            comments: row.comments,
            shares: row.shares,
            follows: row.follows,
            conversions: row.conversions,
            costPerClick:
              row.clicks > 0
                ? row.costInLocalCurrency / row.clicks
                : null,
          },
          update: {
            impressions: row.impressions,
            clicks: row.clicks,
            spend: row.costInLocalCurrency,
            landingPageClicks: row.landingPageClicks,
            reactions: row.reactions,
            comments: row.comments,
            shares: row.shares,
            follows: row.follows,
            conversions: row.conversions,
            costPerClick:
              row.clicks > 0
                ? row.costInLocalCurrency / row.clicks
                : null,
          },
        });
        analyticsCount++;
      } catch (err) {
        logError(
          `Failed to upsert analytics for ${row.campaignUrn} ${row.date}: ${err}`
        );
        errors++;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Failed to fetch analytics: ${msg}`);
    errors++;
  }

  log(
    `Sync complete: ${campaignCount} campaigns, ${analyticsCount} analytics rows, ${errors} errors`
  );
  return { campaigns: campaignCount, analytics: analyticsCount, errors };
}
