import { redirect } from "next/navigation";

// See /team/availability — the single Availability screen.
export default function AdminDisponibilitesRedirect() {
  redirect("/team/availability");
}
