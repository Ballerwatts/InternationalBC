import { redirect } from "next/navigation";

// The single free-text club venue became a real gyms table, because a squad
// can use several halls and a hall can host several squads. Kept so old
// bookmarks and links land somewhere sensible instead of 404-ing.
export default function AdminGymRedirect() {
  redirect("/admin/gyms");
}
