import { auth } from "@/lib/auth.edge";
import { NextResponse } from "next/server";
import {
  isCollaboratorEmail,
  isPathAllowedForCollaborator,
  COLLABORATOR_HOME,
} from "@/lib/access";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isApi = pathname.startsWith("/api");
  const isPublicPage =
    pathname.startsWith("/auth/signin") ||
    pathname.startsWith("/auth/error") ||
    pathname.startsWith("/connect-linkedin");

  // Outside collaborators are confined to the SEO review surfaces. This runs
  // before every other rule and covers API routes as well as pages, so a valid
  // session cannot be used to read the attribution, revenue or user data by
  // calling the API directly.
  if (isCollaboratorEmail(req.auth?.user?.email)) {
    if (isPathAllowedForCollaborator(pathname)) return NextResponse.next();
    return isApi
      ? NextResponse.json({ error: "forbidden" }, { status: 403 })
      : NextResponse.redirect(new URL(COLLABORATOR_HOME, req.url));
  }

  // API routes authenticate themselves in-route — several accept a cron secret
  // instead of a session, so middleware must not redirect them to a login page.
  if (isApi) {
    return NextResponse.next();
  }

  // Allow access to public pages
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

// /api is now matched (it previously was excluded) so the collaborator
// restriction above can cover API routes too. Behaviour for everyone else is
// unchanged: the isApi check passes them straight through to their own
// in-route auth, including the cron-secret endpoints.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
