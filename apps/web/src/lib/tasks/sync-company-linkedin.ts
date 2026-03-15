/**
 * Company LinkedIn Post Sync Task Module
 *
 * Fetches LinkedIn posts and engagement metrics for the company page
 * via the Unipile API. Stores/updates posts in company_linkedin_posts table.
 */

import { prisma } from "../prisma";
import { listPosts, type UnipilePost } from "../unipile";

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

/** Sync company LinkedIn page posts (called by cron) */
export async function syncCompanyLinkedIn(): Promise<{
  synced: number;
  errors: number;
}> {
  const companyId = process.env.COMPANY_LINKEDIN_ID;
  if (!companyId) {
    logError("COMPANY_LINKEDIN_ID not set, skipping company LinkedIn sync");
    return { synced: 0, errors: 0 };
  }

  // Find any connected Unipile account to use for API authentication
  const anyAccount = await prisma.unipileLinkedInAccount.findFirst({
    where: { status: "connected" },
  });

  if (!anyAccount) {
    logError(
      "No connected Unipile accounts available for company LinkedIn sync"
    );
    return { synced: 0, errors: 1 };
  }

  log(
    `Syncing company LinkedIn posts (${companyId}) using account ${anyAccount.unipileAccountId}...`
  );

  let synced = 0;
  let errors = 0;
  let cursor: string | undefined;
  const createdAfter = "2026-01-01T00:00:00.000Z";

  try {
    do {
      const result = await listPosts({
        accountId: anyAccount.unipileAccountId,
        identifier: companyId,
        createdAfter,
        cursor,
      });

      for (const post of result.items) {
        try {
          const postDate = new Date(post.parsed_datetime)
            .toISOString()
            .slice(0, 10);

          await prisma.companyLinkedInPost.upsert({
            where: { socialId: post.social_id },
            create: {
              socialId: post.social_id,
              postText: post.text ?? null,
              postDate,
              shareUrl: post.share_url ?? null,
              impressions: post.impressions_counter ?? 0,
              reactions: post.reaction_counter ?? 0,
              comments: post.comment_counter ?? 0,
              reposts: post.repost_counter ?? 0,
              lastFetchedAt: new Date(),
            },
            update: {
              postText: post.text ?? null,
              impressions: post.impressions_counter ?? 0,
              reactions: post.reaction_counter ?? 0,
              comments: post.comment_counter ?? 0,
              reposts: post.repost_counter ?? 0,
              lastFetchedAt: new Date(),
            },
          });
          synced++;
        } catch (err) {
          logError(`Failed to upsert company post ${post.social_id}: ${err}`);
          errors++;
        }
      }

      cursor = result.has_more ? result.cursor : undefined;

      // Rate limiting: pause between pages
      if (cursor) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } while (cursor);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logError(`Company LinkedIn sync failed: ${errMsg}`);
    errors++;
  }

  log(`Company LinkedIn sync: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}
