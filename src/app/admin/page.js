import Link from "next/link";
import { query } from "@/lib/db";
import { getAccount } from "@/lib/access";
import { visibleGroups } from "@/lib/admin-areas";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const account = await getAccount();
  const groups = visibleGroups(account);
  const can = (area) => groups.some((g) => g.key === area);

  const playerCount = query("SELECT COUNT(*) as c FROM players WHERE active = 1")[0].c;
  const upcomingCount = query(
    "SELECT COUNT(*) as c FROM practices WHERE practice_date >= ?",
    [todayISO()]
  )[0].c;
  const playsCount = query("SELECT COUNT(*) as c FROM plays")[0].c;
  const totalPaid = query(
    "SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE season = ?",
    ["2026-2027"]
  )[0].s;

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold uppercase text-ibc-blue">
        Tableau de bord
      </h1>
      <p className="mt-1 text-sm text-ibc-ink/60">
        Vue d&apos;ensemble du club — le menu de gauche est rangé par section.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {can("organisation") && (
          <StatCard label="Active members" value={playerCount} href="/admin/players" />
        )}
        {can("organisation") && (
          <StatCard label="Événements à venir" value={upcomingCount} href="/admin/schedule" />
        )}
        {can("season") && (
          <StatCard label="Schémas tactiques" value={playsCount} href="/team/tactiques" />
        )}
        {can("finance") && (
          <StatCard label="Dues collected (CHF)" value={totalPaid} href="/admin/budget" />
        )}
      </div>

      {/* One card per section the account may open, so a delegate lands
          somewhere useful instead of on a page of numbers they can't act on. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.key} className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
            <p className="font-display text-lg font-bold uppercase text-ibc-blue">{group.label}</p>
            <p className="mt-0.5 text-xs text-ibc-ink/55">{group.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-ibc-blue/20 px-3 py-1.5 text-xs font-bold uppercase text-ibc-blue transition hover:bg-ibc-blue hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {account?.role === "admin" && (
        <div className="mt-8 rounded-xl border border-ibc-accent bg-ibc-accent/10 p-5">
          <h2 className="font-display text-lg font-bold uppercase text-ibc-blue">
            Rappel automatique du lundi
          </h2>
          <p className="mt-1 text-sm text-ibc-ink/70">
            Une route <code className="rounded bg-black/5 px-1">/api/cron/weekly-reminder</code>{" "}
            envoie par email le programme de la semaine (tableau d&apos;entraînement + matches) à
            tous les joueurs ayant une adresse email enregistrée. Configurez un déclencheur
            externe (Vercel Cron, Railway Cron, ou un ping externe) le lundi matin — voir le
            README pour les instructions de déploiement.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, href }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="font-display text-3xl font-extrabold text-ibc-blue">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ibc-ink/60">{label}</p>
    </Link>
  );
}
