/**
 * Unipile API client — lightweight fetch-based wrapper.
 *
 * Env vars required:
 *   UNIPILE_DSN     — base URL, e.g. https://api33.unipile.com:16394
 *   UNIPILE_API_KEY — access token from Unipile dashboard
 */

function getDsn(): string {
  const dsn = process.env.UNIPILE_DSN?.trim();
  if (!dsn) throw new Error("UNIPILE_DSN is not set");
  return dsn.replace(/\/$/, ""); // strip trailing slash
}

function headers(): Record<string, string> {
  const key = process.env.UNIPILE_API_KEY?.trim();
  if (!key) throw new Error("UNIPILE_API_KEY is not set");
  return {
    "X-API-KEY": key,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnipilePost {
  social_id: string;
  text?: string;
  parsed_datetime: string;
  share_url?: string;
  impressions_counter: number;
  reaction_counter: number;
  comment_counter: number;
  repost_counter: number;
  author?: {
    public_identifier?: string;
    name?: string;
    is_company?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Hosted Auth
// ---------------------------------------------------------------------------

/** Generate a hosted auth link for LinkedIn connection */
export async function createHostedAuthLink(params: {
  notify_url: string;
  success_redirect_url: string;
  failure_redirect_url: string;
  name?: string;
  expiresOn?: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${getDsn()}/api/v1/hosted/accounts/link`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      type: "create",
      providers: ["LINKEDIN"],
      api_url: getDsn(),
      ...params,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Unipile hosted auth failed (${res.status}): ${body}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

interface ListPostsResponse {
  object: string;
  items: UnipilePost[];
  cursor?: string;
  has_more?: boolean;
}

/** Fetch LinkedIn posts for a connected account */
export async function listPosts(params: {
  accountId: string;
  identifier: string; // "me" or a profile identifier
  createdAfter?: string; // ISO datetime
  cursor?: string;
}): Promise<{ items: UnipilePost[]; cursor?: string; has_more: boolean }> {
  const url = new URL(
    `${getDsn()}/api/v1/users/${encodeURIComponent(params.identifier)}/posts`
  );
  url.searchParams.set("account_id", params.accountId);
  if (params.createdAfter)
    url.searchParams.set("createdAfter", params.createdAfter);
  if (params.cursor) url.searchParams.set("cursor", params.cursor);

  const res = await fetch(url.toString(), { headers: headers() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Unipile list posts failed (${res.status}): ${body}`);
  }

  const data: ListPostsResponse = await res.json();
  return {
    items: data.items ?? [],
    cursor: data.cursor,
    has_more: data.has_more ?? false,
  };
}

// ---------------------------------------------------------------------------
// Account info
// ---------------------------------------------------------------------------

/** Fetch account details (useful for getting name after connection) */
export async function getAccount(accountId: string): Promise<{
  id: string;
  name?: string;
  provider?: string;
  status?: string;
  connection_params?: {
    im?: { id?: string };
  };
}> {
  const res = await fetch(`${getDsn()}/api/v1/accounts/${accountId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Unipile get account failed (${res.status}): ${body}`);
  }

  return res.json();
}

/** List all Unipile accounts (used to find newly connected accounts) */
export async function listAccounts(): Promise<
  Array<{
    id: string;
    name?: string;
    provider?: string;
    status?: string;
    created_at?: string;
    connection_params?: {
      im?: { id?: string };
    };
  }>
> {
  const res = await fetch(`${getDsn()}/api/v1/accounts`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Unipile list accounts failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.items ?? data ?? [];
}

// ---------------------------------------------------------------------------
// LinkedIn Search
// ---------------------------------------------------------------------------

/** Search LinkedIn posts (used for company page posts where listPosts doesn't work) */
export async function searchLinkedInPosts(params: {
  accountId: string;
  companyId: string; // numeric LinkedIn company/organization ID
  sortBy?: "date" | "relevance";
  cursor?: string;
}): Promise<{ items: UnipilePost[]; cursor?: string; has_more: boolean }> {
  const url = new URL(`${getDsn()}/api/v1/linkedin/search`);
  url.searchParams.set("account_id", params.accountId.trim());
  if (params.cursor) url.searchParams.set("cursor", params.cursor);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      api: "classic",
      category: "posts",
      posted_by: { company: [params.companyId.trim()] },
      sort_by: params.sortBy ?? "date",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Unipile LinkedIn search failed (${res.status}): ${body}`
    );
  }

  const data: ListPostsResponse = await res.json();
  return {
    items: data.items ?? [],
    cursor: data.cursor,
    has_more: data.has_more ?? false,
  };
}

/**
 * Get the LinkedIn internal ID for a connected account.
 * This is the identifier needed for the posts API (not "me" or public handle).
 */
export async function getLinkedInId(
  accountId: string
): Promise<string | null> {
  const account = await getAccount(accountId);
  return account.connection_params?.im?.id ?? null;
}
