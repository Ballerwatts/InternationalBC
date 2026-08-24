"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { visibleGroups } from "@/lib/admin-areas";

/**
 * Sidebar for /admin, grouped so it is obvious where to look.
 *
 * `account` ({ role, admin_areas }) comes from the server layout — a
 * delegate only ever sees the groups they were granted, and the sidebar
 * never renders a link the page behind it would bounce them out of.
 */
export default function AdminNav({ account }) {
  const pathname = usePathname();
  const groups = visibleGroups(account);
  const isSuper = account?.role === "admin";

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best-effort: still force the user out even if the request fails.
    }
    window.location.href = "/login";
  }

  return (
    <nav className="w-full shrink-0 lg:w-60">
      <p className="font-display text-xl font-extrabold uppercase text-ibc-blue">Admin</p>
      <p className="mt-0.5 text-xs text-ibc-ink/50">
        {isSuper ? "Super-admin — full access" : "Limited access"}
      </p>

      <Link
        href="/admin"
        className={`mt-4 block rounded-lg px-3 py-2 text-sm font-semibold transition ${
          pathname === "/admin"
            ? "bg-ibc-blue text-white"
            : "text-ibc-ink/80 hover:bg-ibc-blue/10"
        }`}
      >
        Dashboard
      </Link>

      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="px-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ibc-ink/40">
              {group.label}
            </p>
            <ul className="mt-1.5 space-y-0.5 border-l-2 border-ibc-accent/40 pl-2">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      pathname === item.href
                        ? "bg-ibc-blue text-white"
                        : "text-ibc-ink/80 hover:bg-ibc-blue/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="mt-5 rounded-lg bg-black/5 px-3 py-2 text-xs text-ibc-ink/60">
          No section has been granted to this account yet.
        </p>
      )}

      <button
        type="button"
        onClick={logout}
        className="mt-6 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-ibc-ink/70 hover:bg-black/5"
      >
        Se déconnecter
      </button>
      <Link href="/" className="mt-2 block text-center text-xs text-ibc-blue hover:underline">
        ← Retour au site
      </Link>
    </nav>
  );
}
