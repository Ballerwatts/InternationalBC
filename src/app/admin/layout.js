import { redirect } from "next/navigation";
import { getAccount } from "@/lib/access";
import { accountHasAnyArea } from "@/lib/admin-areas";
import AdminNav from "@/components/AdminNav";

// Staff and team areas are for members, not search results.
export const metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const account = await getAccount();
  // The super-admin passes on role alone; anyone else needs at least one
  // granted section. Each section then re-checks itself in its own layout.
  if (!accountHasAnyArea(account)) redirect("/login");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
      <AdminNav account={{ role: account.role, admin_areas: account.admin_areas }} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
