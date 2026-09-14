import { query } from "@/lib/db";
import { absolute } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Every public page, at the exact URL it is canonical under. Built from the
// database each time, so a new team, member or news item is listed the
// moment it exists — "index as many pages as possible" without anyone
// having to remember to update a file.
const toDate = (v) => (v ? new Date(String(v).replace(" ", "T") + (String(v).includes("Z") ? "" : "Z")) : new Date());

export default function sitemap() {
  const entry = (path, lastModified, priority, changeFrequency = "weekly") => ({
    url: absolute(path),
    lastModified: toDate(lastModified),
    changeFrequency,
    priority,
  });

  const pages = query("SELECT path, updated_at FROM site_pages");
  const pageDate = Object.fromEntries(pages.map((p) => [p.path, p.updated_at]));

  return [
    entry("/", pageDate["/"], 1.0, "daily"),
    entry("/theclub/", pageDate["/theclub/"], 0.8, "monthly"),
    entry("/theclub/clubhistory/", pageDate["/theclub/clubhistory/"], 0.7, "yearly"),
    entry("/theclub/rulesfees/", pageDate["/theclub/rulesfees/"], 0.8, "monthly"),
    entry("/committee/", pageDate["/committee/"], 0.6, "monthly"),
    entry("/gymnasium/", pageDate["/gymnasium/"], 0.7, "monthly"),
    entry("/teams/", pageDate["/teams/"], 0.9, "weekly"),
    entry("/calendrier/", null, 0.8, "daily"),
    entry("/membres/", null, 0.6, "weekly"),
    ...query("SELECT slug, created_at FROM teams WHERE slug IS NOT NULL").map((t) =>
      entry(`/teams/${t.slug}/`, null, 0.9, "weekly")
    ),
    ...query("SELECT id, updated_at FROM players WHERE active = 1").map((p) =>
      entry(`/membres/${p.id}/`, p.updated_at, 0.5, "monthly")
    ),
    ...query("SELECT id, updated_at FROM announcements WHERE published = 1").map((a) =>
      entry(`/actualites/${a.id}/`, a.updated_at, 0.6, "monthly")
    ),
  ];
}
