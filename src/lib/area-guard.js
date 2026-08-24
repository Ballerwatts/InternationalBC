// Page-level guard for a grouped admin section.
//
// Most /admin/* pages are client components, so they cannot run a server
// permission check themselves. Dropping a two-line `layout.js` into the
// folder gives each section a server component that runs before the page
// renders, without rewriting any of the existing screens.
//
//   // src/app/admin/budget/layout.js
//   import { areaLayout } from "@/lib/area-guard";
//   export const dynamic = "force-dynamic";
//   export default areaLayout("finance");

import { redirect } from "next/navigation";
import { canAccessArea } from "@/lib/access";
import { isAdmin } from "@/lib/auth";

export function areaLayout(area) {
  return async function AreaLayout({ children }) {
    const ok = await canAccessArea(area);
    if (!ok) redirect("/admin");
    return children;
  };
}

/** Same idea, but for a screen the super-admin never delegates. */
export function superAdminLayout() {
  return async function SuperAdminLayout({ children }) {
    const ok = await isAdmin();
    if (!ok) redirect("/admin");
    return children;
  };
}
