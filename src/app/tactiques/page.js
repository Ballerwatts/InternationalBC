import { redirect } from "next/navigation";

// Tactics used to be published publicly here; they're now team-only (see
// /team/tactiques, gated by login in src/app/team/layout.js). This route is
// kept so old links/bookmarks land somewhere sensible instead of a 404.
export const dynamic = "force-dynamic";

export default function TacticsRedirect() {
  redirect("/login");
}
