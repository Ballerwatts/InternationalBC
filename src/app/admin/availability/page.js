import { redirect } from "next/navigation";

// Availability moved into Season planning as a single screen shared by
// coaches, players and admins — /team/availability. This route stays so old
// links, bookmarks and the sidebar history land there instead of 404-ing.
export default function AdminAvailabilityRedirect() {
  redirect("/team/availability");
}
