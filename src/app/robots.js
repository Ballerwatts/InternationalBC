import { headers } from "next/headers";
import { SITE_URL } from "@/lib/seo";

// Crawl everything public on the real domain; keep member and staff areas
// out. On the fly.dev address (and localhost) nothing is crawled at all, so
// the site is never indexed twice under two hostnames.
export default function robots() {
  const host = headers().get("host") || "";
  if (/\.fly\.dev$|^localhost|^127\./.test(host)) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/team/", "/api/", "/login", "/entrainements"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
