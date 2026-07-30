"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/hero", label: "Accueil (hero)" },
  { href: "/admin/announcements", label: "Annonces" },
  { href: "/admin/players", label: "Joueurs" },
  { href: "/admin/budget", label: "Budget" },
  { href: "/admin/schedule", label: "Calendrier" },
  { href: "/admin/users", label: "Comptes joueurs" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <nav className="w-full shrink-0 lg:w-56">
      <p className="font-display text-xl font-extrabold uppercase text-mbc-blue">Admin</p>
      <ul className="mt-4 space-y-1">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                pathname === item.href
                  ? "bg-mbc-blue text-white"
                  : "text-mbc-ink/80 hover:bg-mbc-blue/10"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/team/tactiques"
        className="mt-4 block rounded-lg border border-mbc-blue/20 px-3 py-2 text-center text-xs font-bold uppercase text-mbc-blue hover:bg-mbc-blue/10"
      >
        Espace équipe (tactiques) →
      </Link>
      <button
        type="button"
        onClick={logout}
        className="mt-6 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-mbc-ink/70 hover:bg-black/5"
      >
        Se déconnecter
      </button>
      <Link href="/" className="mt-2 block text-center text-xs text-mbc-blue hover:underline">
        ← Retour au site
      </Link>
    </nav>
  );
}
