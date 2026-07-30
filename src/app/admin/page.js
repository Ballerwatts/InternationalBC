import Link from "next/link";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const playerCount = query("SELECT COUNT(*) as c FROM players WHERE active = 1")[0].c;
  const upcomingCount = query(
    "SELECT COUNT(*) as c FROM practices WHERE practice_date >= ?",
    [new Date().toISOString().slice(0, 10)]
  )[0].c;
  const playsCount = query("SELECT COUNT(*) as c FROM plays")[0].c;
  const totalPaid = query(
    "SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE season = ?",
    ["2026-2027"]
  )[0].s;

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold uppercase text-mbc-blue">
        Tableau de bord
      </h1>
      <p className="mt-1 text-sm text-mbc-ink/60">
        Vue d&apos;ensemble du club — modifiez le contenu du site depuis le menu à gauche.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Joueurs actifs" value={playerCount} href="/admin/players" />
        <StatCard label="Événements à venir" value={upcomingCount} href="/admin/schedule" />
        <StatCard label="Schémas tactiques" value={playsCount} href="/admin/tactiques" />
        <StatCard label="Cotisations encaissées (CHF)" value={totalPaid} href="/admin/budget" />
      </div>

      <div className="mt-8 rounded-xl border border-mbc-yellow bg-mbc-yellow/10 p-5">
        <h2 className="font-display text-lg font-bold uppercase text-mbc-blue">
          Rappel automatique du lundi
        </h2>
        <p className="mt-1 text-sm text-mbc-ink/70">
          Une route <code className="rounded bg-black/5 px-1">/api/cron/weekly-reminder</code> envoie
          par email le programme de la semaine (tableau d&apos;entraînement + matches) à tous les
          joueurs ayant une adresse email enregistrée. Configurez un déclencheur externe (Vercel
          Cron, Railway Cron, ou un ping externe) le lundi matin — voir le README pour les
          instructions de déploiement.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, href }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="font-display text-3xl font-extrabold text-mbc-blue">{value}</p>
      <p className="text-xs uppercase tracking-wide text-mbc-ink/60">{label}</p>
    </Link>
  );
}
