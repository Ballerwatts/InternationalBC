import { redirect } from "next/navigation";

// The practice board used to be published publicly here; it's now
// team-only (see /team/practice-board, gated by login in
// src/app/team/layout.js). Kept so old links/bookmarks land somewhere
// sensible instead of a 404.
export const dynamic = "force-dynamic";

export default function PracticeBoardRedirect() {
  redirect("/login");
}
