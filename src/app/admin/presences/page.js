import { redirect } from "next/navigation";

// Présences, Disponibilités and the old admin Availability page are now one
// screen under Season planning. Kept so old links don't 404.
export default function AdminPresencesRedirect() {
  redirect("/team/availability");
}
