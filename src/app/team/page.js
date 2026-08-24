import { redirect } from "next/navigation";

// Players/coaches land on /team right after login (see src/app/login/page.js)
// — there's no content at the bare /team route itself, so send them
// straight to their Calendar, now the team space's main landing page.
export default function TeamIndexPage() {
  redirect("/team/calendar");
}
