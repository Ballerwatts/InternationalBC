"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Season planning, from the team's side. Everyone on the squad gets the
// same five entries — availability, the schedule, the playbook, the weekly
// board and the register — because a player who can't see the plan can't
// follow it. What differs is editing, not visibility: each page decides
// that from the account's role, and every write is refused server-side for
// a player regardless of what the UI shows.
const ITEMS = [
  { href: "/team/availability", label: "Availability" },
  { href: "/team/calendar", label: "Team calendar" },
  { href: "/team/tactiques", label: "Tactics" },
  { href: "/team/practice-board", label: "Practice board" },
  { href: "/team/appel", label: "Match register" },
];

export default function TeamNav({ isAdmin, isStaff }) {
  const pathname = usePathname();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // even if the network call fails, still force the user back to the
      // login screen — a stuck "logout does nothing" is worse than a
      // best-effort cookie clear.
    }
    // Full page navigation (not the client router) so every bit of
    // client-side state — including anything cached from the previous
    // session — is thrown away, not just the visible route.
    window.location.href = "/login";
  }

  return (
    <nav className="w-full shrink-0 lg:w-56">
      <p className="font-display text-xl font-extrabold uppercase text-ibc-blue">Season planning</p>
      <p className="mt-0.5 text-xs text-ibc-ink/50">
        {isStaff ? "Vous pouvez modifier" : "Lecture seule"}
      </p>
      <ul className="mt-4 space-y-1">
        {ITEMS.map((item) => (
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

      {isAdmin && (
        <Link
          href="/admin"
          className="mt-4 block rounded-lg border border-ibc-blue/20 px-3 py-2 text-center text-xs font-bold uppercase text-ibc-blue hover:bg-ibc-blue/10"
        >
          ← Admin
        </Link>
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
