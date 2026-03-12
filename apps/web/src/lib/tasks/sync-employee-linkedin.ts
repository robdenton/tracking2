/**
 * Employee LinkedIn Post Sync Task Module
 *
 * Fetches LinkedIn posts and engagement metrics for all connected
 * Unipile accounts. Stores/updates posts in employee_linkedin_posts table.
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

/** Sync posts for a single connected account */
export async function syncAccountPosts(
  unipileAccountId: string
): Promise<{ synced: number; errors: number }> {
  log(`Syncing posts for account ${unipileAccountId}...`);

  const account = await prisma.unipileLinkedInAccount.findUnique({
    where: { unipileAccountId },
  });

  if (!account || account.status !== "connected") {
    log(`Account ${unipileAccountId} not found or not connected. Skipping.`);
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;
  let cursor: string | undefined;
  const createdAfter = "2026-01-01T00:00:00.000Z";

  try {
    do {
      const result = await listPosts({
        accountId: unipileAccountId,
        identifier: "me",
        createdAfter,
        cursor,
      });

      for (const post of result.items) {
        try {
          const postDate = new Date(post.parsed_datetime)
            .toISOString()
            .slice(0, 10);

          await prisma.employeeLinkedInPost.upsert({
            where: {
              accountId_socialId: {
                accountId: account.id,
                socialId: post.social_id,
              },
            },
            create: {
              accountId: account.id,
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
          logError(`Failed to upsert post ${post.social_id}: ${err}`);
          errors++;
        }
      }

      cursor = result.has_more ? result.cursor : undefined;

      // Rate limiting: pause between pages
      if (cursor) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } while (cursor);

    await prisma.unipileLinkedInAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logError(`Sync failed for account ${unipileAccountId}: ${errMsg}`);
    await prisma.unipileLinkedInAccount.update({
      where: { id: account.id },
      data: { lastSyncError: errMsg },
    });
    errors++;
  }

  log(`Account ${unipileAccountId}: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

/** Sync all connected accounts (called by cron) */
export async function syncAllEmployeeLinkedIn(): Promise<{
  accounts: number;
  synced: number;
  errors: number;
}> {
  log("Starting employee LinkedIn sync for all connected accounts...");

  const accounts = await prisma.unipileLinkedInAccount.findMany({
    where: { status: "connected" },
  });

  log(`Found ${accounts.length} connected accounts`);

  let totalSynced = 0;
  let totalErrors = 0;

  for (const account of accounts) {
    const result = await syncAccountPosts(account.unipileAccountId);
    totalSynced += result.synced;
    totalErrors += result.errors;

    // Rate limit between accounts
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  log(
    `Sync complete: ${accounts.length} accounts, ${totalSynced} posts synced, ${totalErrors} errors`
  );
  return {
    accounts: accounts.length,
    synced: totalSynced,
    errors: totalErrors,
  };
}
