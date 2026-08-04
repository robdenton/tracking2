/**
 * Bulk apply YouTube classifier decisions to the review queue.
 *
 * Reads /tmp/youtube-pending-decisions.json (from
 * scripts/classify-youtube-reviews.js pending) and:
 *   - For auto_decided "accept": promotes ImportedYouTubeVideo to active,
 *     detects granola link + sponsored disclosure, marks search result accepted
 *   - For auto_decided "reject": archives pending video, marks search result rejected
 *   - Low-confidence rows are skipped (left for human review)
 *
 * Mirrors the logic in apps/web/src/lib/data.ts acceptSearchResult/
 * rejectSearchResult so the result is byte-identical to a human click.
 *
 *   DATABASE_URL=... node scripts/apply-youtube-decisions.js [DRY_RUN=1]
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const DECISIONS_PATH = "/tmp/youtube-pending-decisions.json";
const DRY_RUN = process.env.DRY_RUN === "1";

function detectGranolaLink(description) {
  const urlRegex = /https?:\/\/[^\s<>")\]]+/g;
  const urls = description.match(urlRegex) ?? [];
  const granolaUrls = urls.filter((url) => /granola\.(so|ai|io)/.test(url));
  if (granolaUrls.length === 0) {
    return { granolaLinkInDesc: false, granolaLinkType: "none" };
  }
  const hasTracking = granolaUrls.some(
    (url) =>
      url.includes("utm_") ||
      url.includes("ref=") ||
      url.includes("via=") ||
      url.includes("aff=") ||
      url.includes("?r="),
  );
  return {
    granolaLinkInDesc: true,
    granolaLinkType: hasTracking ? "tracked" : "direct",
  };
}

function detectSponsoredDisclosure(description) {
  const lower = description.toLowerCase();
  return (
    lower.includes("#ad") ||
    lower.includes("#sponsored") ||
    lower.includes("sponsored by") ||
    lower.includes("this video is sponsored") ||
    lower.includes("paid partnership") ||
    lower.includes("paid promotion") ||
    lower.includes("in partnership with")
  );
}

async function acceptSearchResult(p, searchResultId) {
  const searchResult = await p.youTubeSearchResult.findUnique({
    where: { id: searchResultId },
  });
  if (!searchResult) throw new Error("Search result not found: " + searchResultId);

  const today = new Date().toISOString().slice(0, 10);

  const matchingActivity = await p.activity.findFirst({
    where: { channel: "youtube", contentUrl: { contains: searchResult.videoId } },
    select: { id: true },
  });

  const descText = searchResult.description ?? "";
  const granolaLink = detectGranolaLink(descText);
  const sponsored = detectSponsoredDisclosure(descText);

  await p.importedYouTubeVideo.upsert({
    where: { videoId: searchResult.videoId },
    update: {
      status: "active",
      importedDate: today,
      source: matchingActivity ? "paid_sponsorship" : "organic",
      relatedActivityId: matchingActivity?.id ?? null,
      description: searchResult.description,
      granolaLinkInDesc: granolaLink.granolaLinkInDesc,
      granolaLinkType: granolaLink.granolaLinkType,
      sponsoredDisclosure: sponsored,
    },
    create: {
      videoId: searchResult.videoId,
      title: searchResult.title,
      channelTitle: searchResult.channelTitle,
      channelId: searchResult.channelId,
      publishedAt: searchResult.publishedAt,
      url: searchResult.url,
      thumbnailUrl: searchResult.thumbnailUrl,
      description: searchResult.description,
      importedDate: today,
      status: "active",
      source: matchingActivity ? "paid_sponsorship" : "organic",
      relatedActivityId: matchingActivity?.id ?? null,
      granolaLinkInDesc: granolaLink.granolaLinkInDesc,
      granolaLinkType: granolaLink.granolaLinkType,
      sponsoredDisclosure: sponsored,
    },
  });

  await p.youTubeSearchResult.update({
    where: { id: searchResultId },
    data: { status: "accepted" },
  });
}

async function rejectSearchResult(p, searchResultId) {
  const searchResult = await p.youTubeSearchResult.findUnique({
    where: { id: searchResultId },
  });
  await p.youTubeSearchResult.update({
    where: { id: searchResultId },
    data: { status: "rejected" },
  });
  if (searchResult) {
    await p.importedYouTubeVideo.updateMany({
      where: { videoId: searchResult.videoId, status: "pending" },
      data: { status: "archived" },
    });
  }
}

(async () => {
  const p = new PrismaClient();
  const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf-8"));
  const autoDecided = decisions.filter((d) => d.auto_decided);
  const deferred = decisions.filter((d) => !d.auto_decided);
  const accepts = autoDecided.filter((d) => d.ai_decision === "accept");
  const rejects = autoDecided.filter((d) => d.ai_decision === "reject");

  console.log(
    `Loaded ${decisions.length} decisions: ${accepts.length} auto-accept, ` +
      `${rejects.length} auto-reject, ${deferred.length} deferred (skipped)`,
  );
  if (DRY_RUN) console.log("DRY RUN — no DB writes will be made.");
  console.log();

  let accepted = 0,
    rejected = 0,
    errors = 0;

  for (let i = 0; i < accepts.length; i++) {
    const d = accepts[i];
    try {
      if (!DRY_RUN) await acceptSearchResult(p, d.sr_id);
      accepted++;
      if ((i + 1) % 25 === 0)
        console.log(`  accepts: ${i + 1}/${accepts.length}`);
    } catch (e) {
      console.log(`  ! err accepting ${d.sr_id} (${d.title.slice(0, 60)}): ${e.message.slice(0, 100)}`);
      errors++;
    }
  }

  for (let i = 0; i < rejects.length; i++) {
    const d = rejects[i];
    try {
      if (!DRY_RUN) await rejectSearchResult(p, d.sr_id);
      rejected++;
      if ((i + 1) % 25 === 0)
        console.log(`  rejects: ${i + 1}/${rejects.length}`);
    } catch (e) {
      console.log(`  ! err rejecting ${d.sr_id} (${d.title.slice(0, 60)}): ${e.message.slice(0, 100)}`);
      errors++;
    }
  }

  console.log();
  console.log(`Done: ${accepted} accepted, ${rejected} rejected, ${errors} errors`);
  console.log(`Remaining for human review: ${deferred.length}`);

  // Final state
  const state = await p.$queryRawUnsafe(
    `SELECT status, COUNT(*)::int AS n
     FROM youtube_search_results
     GROUP BY status
     ORDER BY n DESC`,
  );
  console.log();
  console.log("youtube_search_results status now:");
  for (const r of state) console.log(`  ${r.status}: ${r.n}`);

  await p.$disconnect();
})().catch((e) => {
  console.error("CRASH:", e.message);
  process.exit(1);
});
