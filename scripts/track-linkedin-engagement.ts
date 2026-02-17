/**
 * LinkedIn Engagement Tracker
 *
 * Fetches engagement metrics (likes, comments, reposts, views) for LinkedIn posts
 * using Puppeteer for headless browser automation.
 *
 * Usage:  npx tsx scripts/track-linkedin-engagement.ts
 *   or:   npm run track-linkedin
 *
 * This script should be run daily (via cron or LaunchAgent) to build a
 * time series of engagement metrics for each LinkedIn post.
 */

import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

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

/**
 * Helper to parse numbers that might be abbreviated (1.2K → 1200)
 */
function parseNumber(text: string): number | null {
  if (!text) return null;

  // Remove commas and whitespace
  const cleaned = text.replace(/[,\s]/g, "");
  if (!cleaned) return null;

  // Handle K (thousands)
  if (cleaned.toLowerCase().includes("k")) {
    const num = parseFloat(cleaned.replace(/[Kk]/gi, ""));
    return Math.round(num * 1000);
  }

  // Handle M (millions)
  if (cleaned.toLowerCase().includes("m")) {
    const num = parseFloat(cleaned.replace(/[Mm]/gi, ""));
    return Math.round(num * 1000000);
  }

  // Regular number
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Convert LinkedIn date formats to YYYY-MM-DD
 * Handles:
 * - Relative: "2d ago", "1w ago", "3mo ago", "1yr ago"
 * - Absolute: "Jan 15", "February 10, 2026"
 * - Returns null if unparseable
 */
function normalizeRelativeDate(dateText: string): string | null {
  const today = new Date();

  // Pattern 1: Relative dates "2d ago", "1w ago", "3mo ago"
  const relativeMatch = dateText.match(/(\d+)([dwmy])\s*ago/i);
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();

    const date = new Date(today);
    if (unit === 'd') date.setDate(date.getDate() - num);
    else if (unit === 'w') date.setDate(date.getDate() - (num * 7));
    else if (unit === 'm') date.setMonth(date.getMonth() - num);
    else if (unit === 'y') date.setFullYear(date.getFullYear() - num);

    return date.toISOString().slice(0, 10);
  }

  // Pattern 2: Absolute dates with year "Feb 10, 2026"
  const absoluteWithYear = dateText.match(/([A-Z][a-z]{2,8})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (absoluteWithYear) {
    const monthName = absoluteWithYear[1];
    const day = absoluteWithYear[2];
    const year = absoluteWithYear[3];
    const date = new Date(`${monthName} ${day}, ${year}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  // Pattern 3: Absolute dates without year "Jan 15" (assume current year)
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

/**
 * Parse LinkedIn page content to extract engagement metrics.
 */
function parseLinkedInMetrics(pageText: string): EngagementMetrics {
  const metrics: EngagementMetrics = {
    postDate: null,
    likes: null,
    comments: null,
    reposts: null,
    views: null,
  };

  // Extract comments first (more reliable pattern)
  const commentsMatch = pageText.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*[Cc]omments?/);
  if (commentsMatch) {
    metrics.comments = parseNumber(commentsMatch[1]);
  }

  // Extract likes/reactions - look for a number on its own line followed by "Comments"
  // Pattern: "512\n273 Comments" where 512 is the reactions count
  const likesBeforeComments = pageText.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*\n\s*\d+[,\d]*(?:\.\d+)?[KkMm]?\s*[Cc]omments?/);
  if (likesBeforeComments) {
    metrics.likes = parseNumber(likesBeforeComments[1]);
  } else {
    // Fallback: look for "X reactions" or "X likes" pattern
    const likesMatch = pageText.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*(?:[Rr]eactions?|[Ll]ikes?)/);
    if (likesMatch) {
      metrics.likes = parseNumber(likesMatch[1]);
    }
  }

  // Extract reposts
  const repostsMatch = pageText.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*reposts?/i);
  if (repostsMatch) {
    metrics.reposts = parseNumber(repostsMatch[1]);
  }

  // Extract views (impressions) - less commonly visible
  const viewsMatch = pageText.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*(?:views?|impressions?)/i);
  if (viewsMatch) {
    metrics.views = parseNumber(viewsMatch[1]);
  }

  // Extract post date with improved patterns and normalization
  let dateMatch = null;

  // Pattern 1: Relative dates (most common: "2d ago", "1w ago")
  dateMatch = pageText.match(/(\d+[dwmy]\s+ago)/i);

  // Pattern 2: Absolute dates with year ("Jan 15, 2026")
  if (!dateMatch) {
    dateMatch = pageText.match(/([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i);
  }

  // Pattern 3: Absolute dates without year ("Jan 15")
  if (!dateMatch) {
    dateMatch = pageText.match(/([A-Z][a-z]{2,8}\s+\d{1,2})\b/i);
  }

  // Pattern 4: Sometimes preceded by "Posted" or "Edited" markers
  if (!dateMatch) {
    dateMatch = pageText.match(/(?:Posted|Edited|Published)\s+[•·]\s+(\d+[dwmy]\s+ago|[A-Z][a-z]{2,8}\s+\d{1,2})/i);
  }

  if (dateMatch) {
    const rawDate = dateMatch[1] || dateMatch[0];
    metrics.postDate = normalizeRelativeDate(rawDate);
  }

  return metrics;
}

/**
 * Navigate to a LinkedIn post and extract engagement metrics
 */
async function extractPostMetrics(
  url: string,
  activityDate: string | null  // NEW: date from Google Sheets
): Promise<EngagementMetrics> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set a realistic user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the LinkedIn post
    log(`  Navigating to: ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract page text content
    const pageText = await page.evaluate(() => document.body.innerText);

    // Parse metrics from page text
    const metrics = parseLinkedInMetrics(pageText);

    // PRIORITIZE SHEETS DATE: Use activity.date if available
    if (activityDate && activityDate.trim() !== '') {
      metrics.postDate = activityDate;
    }
    // Otherwise keep DOM-extracted date (or null if extraction failed)

    return metrics;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log("Starting LinkedIn engagement tracker...");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Fetch all LinkedIn activities with contentUrl
  const activities = await prisma.activity.findMany({
    where: {
      channel: "linkedin",
      contentUrl: { not: null },
      status: "live", // Only track live posts
    },
  });

  log(`Found ${activities.length} LinkedIn activities with content URLs`);

  if (activities.length === 0) {
    log("No LinkedIn posts to track. Exiting.");
    return;
  }

  let tracked = 0;
  let skipped = 0;
  let errors = 0;

  for (const activity of activities) {
    if (!activity.contentUrl) {
      skipped++;
      continue;
    }

    log(`\nProcessing: ${activity.partnerName}`);

    try {
      // Extract metrics using Puppeteer
      const metrics = await extractPostMetrics(
        activity.contentUrl,
        activity.date  // Pass sheets date for prioritization
      );

      log(`  Extracted metrics:`);
      log(`    Likes: ${metrics.likes ?? 'N/A'}`);
      log(`    Comments: ${metrics.comments ?? 'N/A'}`);
      log(`    Reposts: ${metrics.reposts ?? 'N/A'}`);
      log(`    Views: ${metrics.views ?? 'N/A'}`);
      const dateSource = activity.date ? '(from Sheets)' : '(from DOM)';
      log(`    Post Date: ${metrics.postDate ?? 'N/A'} ${metrics.postDate ? dateSource : ''}`);

      // Upsert into database
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

      // Rate limiting: sleep 3 seconds between posts to avoid detection
      if (activities.indexOf(activity) < activities.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (err) {
      logError(`Failed to process ${activity.partnerName}: ${err}`);
      errors++;

      // Continue to next post even if one fails
      continue;
    }
  }

  log(`\nTracking complete:`);
  log(`  Tracked: ${tracked}`);
  log(`  Skipped: ${skipped}`);
  log(`  Errors: ${errors}`);
}

main()
  .catch((e) => {
    logError(`Unexpected error: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
