/**
 * LinkedIn Company Feed Parser
 *
 * Parses raw page text from a LinkedIn company posts feed into individual
 * posts with engagement metrics. No browser automation required — works
 * from copy-pasted page text.
 */

export interface ParsedPost {
  postText: string;
  postDate: string | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
}

export interface ParseResult {
  companyName: string | null;
  posts: ParsedPost[];
}

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
  const relativeMatch = dateText.match(/(\d+)([dwmy])\s*(?:ago)?/i);
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
 */
export function extractSlug(url: string): string | null {
  const match = url.match(/linkedin\.com\/company\/([^/?#]+)/i);
  return match ? match[1] : null;
}

/**
 * Parses raw page text from a LinkedIn company posts feed.
 *
 * LinkedIn's feed text (when copied via Cmd+A, Cmd+C) follows a pattern:
 * - Company name posted this • [time ago]
 * - Post content text
 * - Engagement line: "X reactions • Y comments • Z reposts"
 * - Then "Like", "Comment", "Repost", "Send" action labels
 *
 * We split on the engagement/action patterns to identify post boundaries.
 */
export function parseLinkedInFeed(rawText: string): ParseResult {
  // Try to extract company name from the top of the page
  const nameMatch = rawText.match(
    /^([\s\S]{0,500}?)(?:\d+[,\d]*\s*followers|\d+[,\d]*\s*employees)/m
  );
  let companyName: string | null = null;
  if (nameMatch) {
    // The company name is usually in the first few lines
    const headerLines = nameMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (headerLines.length > 0) {
      companyName = headerLines[0];
    }
  }

  // Split the text into post blocks.
  // LinkedIn feed text has a recurring pattern:
  //   [Company] posted this • [time]
  //   [Post content]
  //   [reactions/comments/reposts line]
  //   Like Comment Repost Send
  //
  // We use the "Like\nComment\nRepost\nSend" or "Like Comment Repost Send"
  // action bar as a post boundary delimiter.
  const actionBarPattern =
    /\n\s*Like\s*\n?\s*Comment\s*\n?\s*Repost\s*\n?\s*Send\s*\n/gi;
  const blocks = rawText.split(actionBarPattern);

  const posts: ParsedPost[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length < 30) continue;

    const lines = trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) continue;

    // Look for a date/time line — usually contains "Xd", "Xw", "Xmo" etc.
    let postDate: string | null = null;
    let dateLineIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      if (
        /\d+[dwmy]\b/i.test(line) ||
        /\d+\s*(?:day|week|month|year|hr|hour|min)/i.test(line) ||
        /posted this/i.test(line) ||
        /reposted this/i.test(line)
      ) {
        const dateMatch = line.match(/(\d+[dwmy])/i);
        if (dateMatch) {
          postDate = normalizeRelativeDate(dateMatch[1]);
        }
        dateLineIdx = i;
        break;
      }
    }

    // Look for engagement metrics — usually last few lines of the block
    let likes: number | null = null;
    let comments: number | null = null;
    let reposts: number | null = null;
    let engagementLineIdx = lines.length;

    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
      const line = lines[i];
      if (/reactions?|likes?|comments?|reposts?/i.test(line)) {
        const likesMatch = line.match(
          /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*(?:reactions?|likes?)/i
        );
        const commentsMatch = line.match(
          /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*comments?/i
        );
        const repostsMatch = line.match(
          /(\d+[,\d]*(?:\.\d+)?[KkMm]?)\s*reposts?/i
        );

        if (likesMatch) likes = parseNumber(likesMatch[1]);
        if (commentsMatch) comments = parseNumber(commentsMatch[1]);
        if (repostsMatch) reposts = parseNumber(repostsMatch[1]);

        engagementLineIdx = Math.min(engagementLineIdx, i);
      }
    }

    // The post content is between the date line and the engagement line
    const startIdx = dateLineIdx >= 0 ? dateLineIdx + 1 : 0;
    const endIdx = engagementLineIdx;
    const contentLines = lines.slice(startIdx, endIdx);

    // Filter out common noise lines
    const postText = contentLines
      .filter(
        (l) =>
          !/^(Follow|Report this|More|…see more|see less|Promoted|Edited)$/i.test(
            l
          ) &&
          !/^\d+$/.test(l) && // standalone numbers
          l.length > 1
      )
      .join("\n")
      .trim();

    if (postText.length < 20) continue;

    posts.push({
      postText: postText.slice(0, 1500),
      postDate,
      likes,
      comments,
      reposts,
    });
  }

  return { companyName, posts };
}
