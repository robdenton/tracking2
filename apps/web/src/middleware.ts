import { auth } from "@/lib/auth.edge";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicPage =
    req.nextUrl.pathname.startsWith("/auth/signin") ||
    req.nextUrl.pathname.startsWith("/auth/error") ||
    req.nextUrl.pathname.startsWith("/connect-linkedin");

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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
