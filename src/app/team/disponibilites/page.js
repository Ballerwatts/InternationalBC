import { redirect } from "next/navigation";

// Présences and Disponibilités were merged into the single Availability
// screen under Season planning. Kept so old links, bookmarks and the weekly
// reminder email still land somewhere sensible instead of 404-ing.
export default function TeamDisponibilitesRedirect() {
  redirect("/team/availability");
}
