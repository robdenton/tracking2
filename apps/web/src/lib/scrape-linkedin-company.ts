/**
 * LinkedIn Company Posts Scraper
 *
 * Scrapes the recent posts feed from a LinkedIn company page and extracts
 * post text, dates, and engagement metrics using headless browser automation.
 *
 * Reuses the same Puppeteer infrastructure as track-linkedin.ts.
 */

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

export interface ScrapedPost {
  postText: string;
  postDate: string | null;
  postUrl: string | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  views: number | null;
}

export interface ScrapeResult {
  companyName: string | null;
  posts: ScrapedPost[];
  authWall: boolean;
}

// Re-used from track-linkedin.ts
function parseNumber(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[,\s]/g, "");
  if (!cleaned) return null;
  if (cleaned.toLowerCase().includes("k")) {
    return Math.round(parseFloat(cleaned.replace(/[Kk]/gi, "")) * 1000);
  }
  if (cleaned.toLowerCase().includes("m")) {
    return Math.round(parseFloat(cleaned.replace(/[Mm]/gi, "")) * 1000000);
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
    /([A-Z][a-z]{2,8})\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (absoluteWithYear) {
    const date = new Date(
      `${absoluteWithYear[1]} ${absoluteWithYear[2]}, ${absoluteWithYear[3]}`
    );
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const absoluteNoYear = dateText.match(/([A-Z][a-z]{2,8})\s+(\d{1,2})\b/i);
  if (absoluteNoYear) {
    const date = new Date(
      `${absoluteNoYear[1]} ${absoluteNoYear[2]}, ${today.getFullYear()}`
    );
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Extracts the company slug from a LinkedIn company URL.
 * e.g. "https://www.linkedin.com/company/linearapp/posts/" → "linearapp"
 */
export function extractSlug(url: string): string | null {
  const match = url.match(/linkedin\.com\/company\/([^/?#]+)/i);
  return match ? match[1] : null;
}

/**
 * Normalises a company URL to always point at the posts feed.
 */
export function normaliseCompanyUrl(url: string): string {
  const slug = extractSlug(url);
  if (!slug) return url;
  return `https://www.linkedin.com/company/${slug}/posts/?feedView=all`;
}

/**
 * Scrapes the company posts feed and returns up to ~20 recent posts.
 */
export async function scrapeLinkedInCompany(
  companyUrl: string
): Promise<ScrapeResult> {
  const feedUrl = normaliseCompanyUrl(companyUrl);
  log(`Scraping LinkedIn company feed: ${feedUrl}`);

  // On Vercel, the @sparticuz/chromium binary is not bundled with the function.
  // We pass a remote URL so chromium downloads and caches it at runtime.
  // The CHROMIUM_REMOTE_EXEC_PATH env var can override (e.g. for local use).
  const remoteUrl =
    process.env.CHROMIUM_REMOTE_EXEC_PATH ??
    "https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.x64.tar";

  const executablePath =
    process.env.NODE_ENV === "development"
      ? undefined // use system Chrome in local dev if available
      : await chromium.executablePath(remoteUrl);

  const browser = await puppeteer.launch({
    args: puppeteer.defaultArgs({ args: chromium.args, headless: true }),
    defaultViewport: { width: 1280, height: 900 },
    executablePath,
    headless: "shell",
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
    );

    // Block heavy resources to speed up load
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    log(`  Navigating to: ${feedUrl}`);
    const response = await page.goto(feedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const httpStatus = response?.status() ?? 0;
    log(`  HTTP status: ${httpStatus}`);

    // LinkedIn often returns 999 for bot detection or 404/403 for blocked requests.
    // Don't throw — instead, continue and check the page content for auth wall or usable data.
    if (httpStatus >= 400 && httpStatus !== 999) {
      log(`  Non-success HTTP status ${httpStatus}, will check page content...`);
    }

    // Wait for dynamic content to render
    await new Promise((r) => setTimeout(r, 4000));

    // Scroll down once to trigger lazy loading of more posts
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const pageText = document.body.innerText;

      // Auth wall detection
      const isAuthWall =
        pageText.includes("Join LinkedIn") ||
        pageText.includes("Sign in") ||
        pageText.includes("authwall") ||
        pageText.includes("Log in or sign up");

      if (isAuthWall) {
        return { companyName: null, posts: [], authWall: true };
      }

      // Try to extract company name from the page title or header
      const titleEl =
        document.querySelector("h1") ||
        document.querySelector(".org-top-card-summary__title") ||
        document.querySelector('[data-test-id="company-name"]');
      const companyName = titleEl?.textContent?.trim() ?? null;

      // LinkedIn feed: posts are inside article or feed-update containers.
      // We look for the main post text blocks — each update has a "see more" / text block
      // Strategy: find all elements with substantial text that look like post bodies
      const posts: Array<{
        postText: string;
        postDate: string | null;
        postUrl: string | null;
        engagementText: string;
      }> = [];

      // Try to find feed update containers (class names vary by LinkedIn version)
      const selectors = [
        "div.feed-shared-update-v2",
        "article.occludable-update",
        ".ember-view.occludable-update",
        '[data-urn*="activity"]',
        ".feed-shared-update",
      ];

      let containers: NodeListOf<Element> | Element[] | null = null;
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
          containers = found;
          break;
        }
      }

      if (containers && containers.length > 0) {
        // DOM-based extraction
        for (const container of Array.from(containers).slice(0, 25)) {
          const textEl =
            container.querySelector(".feed-shared-text") ||
            container.querySelector(".update-components-text") ||
            container.querySelector("[data-test-id='main-feed-activity-card__commentary']") ||
            container.querySelector(".attributed-text-segment-list__content");

          const postText = (
            textEl?.textContent ??
            container.textContent ??
            ""
          ).trim();

          if (postText.length < 20) continue;

          // Date element
          const dateEl =
            container.querySelector("time") ||
            container.querySelector(".feed-shared-actor__sub-description") ||
            container.querySelector(".update-components-actor__sub-description");
          const postDate = dateEl?.textContent?.trim() ?? null;

          // Post URL
          const linkEl = container.querySelector(
            'a[href*="/posts/"], a[href*="/feed/update/"]'
          ) as HTMLAnchorElement | null;
          const postUrl = linkEl?.href ?? null;

          // Engagement area
          const engagementEl =
            container.querySelector(".social-details-social-counts") ||
            container.querySelector(".feed-shared-social-action-bar");
          const engagementText = engagementEl?.textContent?.trim() ?? "";

          posts.push({ postText, postDate, postUrl, engagementText });
        }
      }

      if (posts.length === 0) {
        // Fallback: text-based heuristic extraction from page text
        // Split by common separator patterns LinkedIn uses between posts
        const lines = pageText.split("\n").filter((l) => l.trim().length > 0);
        const chunks: string[] = [];
        let current = "";
        for (const line of lines) {
          // LinkedIn often shows "X reactions • Y comments" as engagement summary
          if (/\d+\s*(reactions?|likes?|comments?|reposts?)/.test(line)) {
            if (current.trim().length > 30) {
              chunks.push(current.trim());
            }
            current = "";
          } else {
            current += " " + line;
          }
        }
        if (current.trim().length > 30) chunks.push(current.trim());

        for (const chunk of chunks.slice(0, 20)) {
          posts.push({
            postText: chunk.slice(0, 1000),
            postDate: null,
            postUrl: null,
            engagementText: "",
          });
        }
      }

      return { companyName, posts, authWall: false };
    });

    if (result.authWall) {
      log("  ⚠ Auth wall detected — LinkedIn requires login");
      return { companyName: null, posts: [], authWall: true };
    }

    log(`  Company name: ${result.companyName ?? "(not found)"}`);
    log(`  Found ${result.posts.length} post containers`);

    // Parse engagement metrics from the engagementText for each post
    const posts: ScrapedPost[] = result.posts.map((p) => {
      const et = p.engagementText;

      const likesMatch = et.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*(?:[Rr]eactions?|[Ll]ikes?)/);
      const commentsMatch = et.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*[Cc]omments?/);
      const repostsMatch = et.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*reposts?/i);
      const viewsMatch = et.match(/(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*(?:views?|impressions?)/i);

      const postDate = p.postDate ? normalizeRelativeDate(p.postDate) : null;

      return {
        postText: p.postText.slice(0, 1500),
        postDate,
        postUrl: p.postUrl,
        likes: likesMatch ? parseNumber(likesMatch[1]) : null,
        comments: commentsMatch ? parseNumber(commentsMatch[1]) : null,
        reposts: repostsMatch ? parseNumber(repostsMatch[1]) : null,
        views: viewsMatch ? parseNumber(viewsMatch[1]) : null,
      };
    });

    return {
      companyName: result.companyName,
      posts,
      authWall: false,
    };
  } finally {
    await browser.close();
    log("Browser closed.");
  }
}
