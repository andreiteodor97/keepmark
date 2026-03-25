import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pubDomain = process.env.PUB_DOMAIN || "pub.keepmark.aiia.ro";

  // Check if this is a site-serving request (wildcard subdomain)
  if (hostname.endsWith(pubDomain) && hostname !== pubDomain) {
    const slug = hostname.replace(`.${pubDomain}`, "").split(".")[0];
    if (slug && /^[a-z0-9]+$/.test(slug)) {
      const path = request.nextUrl.pathname;
      // Rewrite to internal gateway route
      const url = request.nextUrl.clone();
      url.pathname = `/site-gateway/${slug}${path}`;
      return NextResponse.rewrite(url);
    }
  }

  // Existing protected route logic
  const { pathname } = request.nextUrl;
  const protectedPaths = ["/dashboard", "/settings", "/read"];

  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const session = request.cookies.get("km_session");
    if (!session?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/read/:path*",
    // Match everything for subdomain detection
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
