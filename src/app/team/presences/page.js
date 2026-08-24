import { redirect } from "next/navigation";

// See /team/availability — the single Availability screen.
export default function TeamPresencesRedirect() {
  redirect("/team/availability");
}
