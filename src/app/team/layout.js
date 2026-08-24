import { redirect } from "next/navigation";
import { isAuthenticated, getSession } from "@/lib/auth";
import TeamNav from "@/components/TeamNav";

export const dynamic = "force-dynamic";

export default async function TeamLayout({ children }) {
  const ok = await isAuthenticated();
  if (!ok) redirect("/login");
  const session = await getSession();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
      <TeamNav isAdmin={session?.role === "admin"} isStaff={session?.role === "admin" || session?.role === "coach"} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
