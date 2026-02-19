/**
 * LinkedIn Engagement Tracker Task Module
 *
 * Fetches engagement metrics (likes, comments, reposts, views) for LinkedIn posts
 * using Puppeteer for headless browser automation with serverless Chrome.
 *
 * Uses a single browser instance across all activities to reduce overhead and
 * avoid Vercel function timeouts.
 */

import { prisma } from "../prisma";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

// ---------------------------------------------------------------------------
// LinkedIn Engagement Extraction
// ---------------------------------------------------------------------------

interface EngagementMetrics {
  postDate: string | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  views: number | null;
}

function parseNumber(text: string): number | null {
  if (!text) return null;

  const cleaned = text.replace(/[,\s]/g, "");
  if (!cleaned) return null;

  if (cleaned.toLowerCase().includes("k")) {
    const num = parseFloat(cleaned.replace(/[Kk]/gi, ""));
    return Math.round(num * 1000);
  }

  if (cleaned.toLowerCase().includes("m")) {
    const num = parseFloat(cleaned.replace(/[Mm]/gi, ""));
    return Math.round(num * 1000000);
  }

  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function normalizeRelativeDate(dateText: string): string | null {
  const today = new Date();

  const relativeMatch = dateText.match(/(\d+)([dwmy])\s*ago/i);
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();

    const date = new Date(today);
    if (unit === "d") date.setDate(date.getDate() - num);
    else if (unit === "w") date.setDate(date.getDate() - num * 7);
    else if (unit === "m") date.setMonth(date.getMonth() - num);
    else if (unit === "y") date.setFullYear(date.getFullYear() - num);

    return date.toISOString().slice(0, 10);
  }

  const absoluteWithYear = dateText.match(
    /([A-Z][a-z]{2,8})\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (absoluteWithYear) {
    const monthName = absoluteWithYear[1];
    const day = absoluteWithYear[2];
    const year = absoluteWithYear[3];
    const date = new Date(`${monthName} ${day}, ${year}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  const absoluteNoYear = dateText.match(/([A-Z][a-z]{2,8})\s+(\d{1,2})\b/i);
  if (absoluteNoYear) {
    const monthName = absoluteNoYear[1];
    const day = absoluteNoYear[2];
    const year = today.getFullYear();
    const date = new Date(`${monthName} ${day}, ${year}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return null;
}

function parseLinkedInMetrics(pageText: string): EngagementMetrics {
  const metrics: EngagementMetrics = {
    postDate: null,
    likes: null,
    comments: null,
    reposts: null,
    views: null,
  };

  // Detect auth wall — LinkedIn redirects unauthenticated requests to login
  const isAuthWall =
    pageText.includes("Join LinkedIn") ||
    pageText.includes("Sign in") ||
    pageText.includes("authwall") ||
    pageText.includes("Log in or sign up");
  if (isAuthWall) {
    log("  ⚠ Auth wall detected — LinkedIn requires login to view this post");
    return metrics; // all nulls
  }

  const commentsMatch = pageText.match(
    /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*[Cc]omments?/,
  );
  if (commentsMatch) {
    metrics.comments = parseNumber(commentsMatch[1]);
  }

  const likesBeforeComments = pageText.match(
    /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*\n\s*\d+[,\d]*(?:\.\d+)?[KkMm]?\s*[Cc]omments?/,
  );
  if (likesBeforeComments) {
    metrics.likes = parseNumber(likesBeforeComments[1]);
  } else {
    const likesMatch = pageText.match(
      /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*(?:[Rr]eactions?|[Ll]ikes?)/,
    );
    if (likesMatch) {
      metrics.likes = parseNumber(likesMatch[1]);
    }
  }

  const repostsMatch = pageText.match(
    /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*reposts?/i,
  );
  if (repostsMatch) {
    metrics.reposts = parseNumber(repostsMatch[1]);
  }

  const viewsMatch = pageText.match(
    /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*(?:views?|impressions?)/i,
  );
  if (viewsMatch) {
    metrics.views = parseNumber(viewsMatch[1]);
  }

  let dateMatch = null;

  dateMatch = pageText.match(/(\d+[dwmy]\s+ago)/i);

  if (!dateMatch) {
    dateMatch = pageText.match(/([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i);
  }

  if (!dateMatch) {
    dateMatch = pageText.match(/([A-Z][a-z]{2,8}\s+\d{1,2})\b/i);
  }

  if (!dateMatch) {
    dateMatch = pageText.match(
      /(?:Posted|Edited|Published)\s+[•·]\s+(\d+[dwmy]\s+ago|[A-Z][a-z]{2,8}\s+\d{1,2})/i,
    );
  }

  if (dateMatch) {
    const rawDate = dateMatch[1] || dateMatch[0];
    metrics.postDate = normalizeRelativeDate(rawDate);
  }

  return metrics;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function trackLinkedInEngagement(): Promise<{
  tracked: number;
  skipped: number;
  errors: number;
}> {
  log("Starting LinkedIn engagement tracker...");

  const today = new Date().toISOString().slice(0, 10);

  const activities = await prisma.activity.findMany({
    where: {
      channel: "linkedin",
      contentUrl: { not: null },
      status: "live",
    },
  });

  log(`Found ${activities.length} LinkedIn activities with content URLs`);

  if (activities.length === 0) {
    log("No LinkedIn posts to track. Exiting.");
    return { tracked: 0, skipped: 0, errors: 0 };
  }

  let tracked = 0;
  let skipped = 0;
  let errors = 0;

  // Launch a single browser instance shared across all activities.
  // @sparticuz/chromium v143 + puppeteer-core v24:
  //   headless: "shell" uses chrome-headless-shell (already in chromium.args)
  //   puppeteer.defaultArgs merges chromium's serverless flags with puppeteer's defaults
  log("Launching headless browser...");
  const remoteUrl =
    process.env.CHROMIUM_REMOTE_EXEC_PATH ??
    "https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.tar";
  const executablePath =
    process.env.NODE_ENV === "development"
      ? undefined
      : await chromium.executablePath(remoteUrl);
  const browser = await puppeteer.launch({
    args: puppeteer.defaultArgs({ args: chromium.args, headless: true }),
    defaultViewport: { width: 1280, height: 800 },
    executablePath,
    headless: "shell",
  });
  log(`Browser launched (executablePath: ${executablePath})`);

  try {
    for (const activity of activities) {
      if (!activity.contentUrl) {
        skipped++;
        continue;
      }

      log(`\nProcessing: ${activity.partnerName} — ${activity.contentUrl}`);

      try {
        const page = await browser.newPage();

        await page.setUserAgent(
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        );

        // Block images/fonts/css to speed up page loads
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          const type = req.resourceType();
          if (["image", "stylesheet", "font", "media"].includes(type)) {
            req.abort();
          } else {
            req.continue();
          }
        });

        log(`  Navigating to: ${activity.contentUrl}`);
        await page.goto(activity.contentUrl, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });

        // Brief wait for any dynamic content
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pageText = await page.evaluate(() => document.body.innerText);
        await page.close();

        // Log a short preview to help diagnose auth walls or unexpected pages
        const preview = pageText.slice(0, 150).replace(/\n/g, " ");
        log(`  Page preview: "${preview}"`);

        const metrics = parseLinkedInMetrics(pageText);

        // Always use the activity date from Sheets as the canonical post date
        if (activity.date && activity.date.trim() !== "") {
          metrics.postDate = activity.date;
        }

        log(`  Extracted: likes=${metrics.likes ?? "N/A"}, comments=${metrics.comments ?? "N/A"}, reposts=${metrics.reposts ?? "N/A"}, views=${metrics.views ?? "N/A"}`);

        await prisma.linkedInEngagement.upsert({
          where: {
            activityId_date: {
              activityId: activity.id,
              date: today,
            },
          },
          create: {
            activityId: activity.id,
            date: today,
            postDate: metrics.postDate,
            likes: metrics.likes,
            comments: metrics.comments,
            reposts: metrics.reposts,
            views: metrics.views,
          },
          update: {
            postDate: metrics.postDate,
            likes: metrics.likes,
            comments: metrics.comments,
            reposts: metrics.reposts,
            views: metrics.views,
          },
        });

        log(`  ✓ Saved to database`);
        tracked++;

        // Brief pause between posts to avoid rate-limiting
        if (activities.indexOf(activity) < activities.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err) {
        logError(
          `Failed to process ${activity.partnerName}: ${err instanceof Error ? err.message : String(err)}`,
        );
        errors++;
        // Clean up any pages that may have been left open before continuing
        const pages = await browser.pages();
        for (const p of pages.slice(1)) {
          await p.close().catch(() => {});
        }
      }
    }
  } finally {
    await browser.close();
    log("Browser closed.");
  }

  log(`\nTracking complete:`);
  log(`  Tracked: ${tracked}`);
  log(`  Skipped: ${skipped}`);
  log(`  Errors: ${errors}`);

  return { tracked, skipped, errors };
}
