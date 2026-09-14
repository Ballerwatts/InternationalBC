import { notFound } from "next/navigation";
import { get } from "@/lib/db";
import { pageMetadata, snippet } from "@/lib/seo";

export function getSitePage(path) {
  return get("SELECT * FROM site_pages WHERE path = ?", [path]) ?? null;
}

/** Metadata for a content page, from its row. */
export function sitePageMetadata(path) {
  const page = getSitePage(path);
  if (!page) return {};
  return pageMetadata({
    title: page.title,
    description: page.description || snippet(page.body),
    path,
  });
}

export function requireSitePage(path) {
  const page = getSitePage(path);
  if (!page) notFound();
  return page;
}
