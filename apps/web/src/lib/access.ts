// Who may sign in, and what they may reach once they have.
//
// This module is imported by BOTH the Node auth config and the edge middleware,
// so it must stay free of Prisma and any other Node-only dependency.
//
// Two tiers:
//
//   @granola.so            full access to the whole measurement tool
//   named collaborators    the SEO review surfaces only
//
// The collaborator list is per-ADDRESS, not per-domain. Allowing
// "@discoveredlabs.com" wholesale would admit anyone who ever holds an address
// at that domain; three people were asked for, so three people are named.

const ALLOWED_DOMAIN = "@granola.so";

// Overridable from Vercel without a code change (comma-separated). The built-in
// list is the fallback so access keeps working if the variable is never set.
// Set ALLOWED_EMAILS to a single space to revoke all outside access.
const DEFAULT_COLLABORATORS = [
  "team@discoveredlabs.com",
  "majda@discoveredlabs.com",
  "shqiponje@discoveredlabs.com",
];

const collaborators = new Set(
  (process.env.ALLOWED_EMAILS?.trim()
    ? process.env.ALLOWED_EMAILS.split(",")
    : DEFAULT_COLLABORATORS
  )
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

const normalise = (email: string | null | undefined): string =>
  (email ?? "").trim().toLowerCase();

/** Full-access staff account. */
export function isStaffEmail(email: string | null | undefined): boolean {
  const n = normalise(email);
  // The leading "@" anchors this: "attacker@notgranola.so" does not match.
  return n.length > ALLOWED_DOMAIN.length && n.endsWith(ALLOWED_DOMAIN);
}

/** Outside collaborator, restricted to the review surfaces. */
export function isCollaboratorEmail(email: string | null | undefined): boolean {
  const n = normalise(email);
  return n !== "" && !isStaffEmail(n) && collaborators.has(n);
}

/** May this address sign in at all? */
export function isAllowedEmail(email: string | null | undefined): boolean {
  return isStaffEmail(email) || isCollaboratorEmail(email);
}

// Everything a collaborator is allowed to reach. Anything not listed here is
// refused — including every other API route, so a valid session cannot be used
// to curl the revenue, attribution or user data directly.
const COLLABORATOR_PREFIXES = [
  "/seo-review",
  "/seo-audit",
  "/api/seo-review",
  "/api/seo-audit",
  "/review", // the published static review pages in public/review/
  "/api/auth", // NextAuth itself — without this they cannot sign in or out
];

// The review index is the published static page, NOT /seo-review — that path
// has no page of its own, only the /seo-review/changes child route, so sending
// collaborators there lands them on a 404.
export const COLLABORATOR_HOME = "/review/index.html";

export function isPathAllowedForCollaborator(pathname: string): boolean {
  return COLLABORATOR_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
