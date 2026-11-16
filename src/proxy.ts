import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, negotiateLocale } from "@/i18n";
import { decodeSession, SESSION_COOKIE } from "@/lib/session-token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin area: optimistic check that sends visitors without a valid session to the login page.
  // Pages and Server Actions still verify the user in the database.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!decodeSession(request.cookies.get(SESSION_COOKIE)?.value)) {
      const url = new URL("/admin/login", request.url);
      if (pathname !== "/admin") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Public site: every page lives under /en or /de. Add the language the browser prefers.
  const first = pathname.split("/")[1] ?? "";
  if (hasLocale(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${negotiateLocale(request.headers.get("accept-language"))}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension (favicon.ico, …).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
