import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const ok = await isAdmin();
  if (!ok) redirect("/login");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
      <AdminNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
