import { NextResponse } from "next/server";
import { resolveLegacyUrl } from "@/lib/legacy-urls";

// Old WordPress addresses: page_id links are redirected permanently without
// their query string; WordPress machinery answers 410 Gone, which tells a
// search engine to drop the URL now rather than keep retrying a 404.
export function middleware(request) {
  const outcome = resolveLegacyUrl(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (outcome?.redirect) return NextResponse.redirect(new URL(outcome.redirect, request.url), 301);
  if (outcome?.gone) {
    return new NextResponse("Gone — this address belonged to the previous website.", {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/feed/:path*",
    "/comments/feed/:path*",
    "/xmlrpc.php",
    "/wp-admin/:path*",
    "/wp-login.php",
    "/wp-json/:path*",
    "/wp-includes/:path*",
    "/wp-sitemap.xml",
  ],
};
