"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/team/tactiques", label: "Tactiques" },
  { href: "/team/practice-board", label: "Tableau d'entraînement" },
];

export default function TeamNav({ isAdmin }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <nav className="w-full shrink-0 lg:w-56">
      <p className="font-display text-xl font-extrabold uppercase text-mbc-blue">Espace équipe</p>
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
      {isAdmin && (
        <Link
          href="/admin"
          className="mt-4 block rounded-lg border border-mbc-blue/20 px-3 py-2 text-center text-xs font-bold uppercase text-mbc-blue hover:bg-mbc-blue/10"
        >
          ← Espace admin
        </Link>
      )}
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
