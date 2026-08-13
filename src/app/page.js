import Image from "next/image";
import Link from "next/link";
import { getAllSettings, query } from "@/lib/db";
import PracticeMap from "@/components/PracticeMap";

export const dynamic = "force-dynamic";

function nextPractices(limit = 4) {
  const today = new Date().toISOString().slice(0, 10);
  return query(
    `SELECT * FROM practices WHERE practice_date >= ? ORDER BY practice_date ASC, start_time ASC LIMIT ?`,
    [today, limit]
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" });
}

export default function HomePage() {
  const settings = getAllSettings();
  const announcements = query(
    "SELECT * FROM announcements WHERE published = 1 ORDER BY created_at DESC LIMIT 3"
  );
  const upcoming = nextPractices(4);
  const topPlayers = query(
    "SELECT * FROM players WHERE active = 1 ORDER BY total_points DESC LIMIT 3"
  );

  return (
    <div>
      {/* HERO */}
      <section className="bg-court relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
          <CourtLines />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col-reverse items-center gap-10 px-4 py-16 md:flex-row md:py-24">
          <div className="max-w-xl text-center md:text-left">
            <p className="mb-3 inline-block rounded-full bg-ibc-accent px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-ibc-ink">
              {settings.hero_subheadline}
            </p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              {settings.hero_headline}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">
              {settings.hero_body}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link
                href="/calendrier"
                className="rounded-full bg-ibc-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-ibc-ink shadow-lg transition hover:brightness-95"
              >
                Voir le calendrier
              </Link>
              <Link
                href="/equipe"
                className="rounded-full border-2 border-white/70 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white hover:text-ibc-blue"
              >
                Découvrir l&apos;équipe
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border-4 border-ibc-accent bg-ibc-blue-dark shadow-2xl">
            {settings.team_photo_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.team_photo_data_url}
                alt="Photo de l'équipe International Basketball Club Genève"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center text-white/70">
                <Image src="/logo.png" alt="Logo" width={96} height={96} />
                <p className="text-sm">
                  Photo d&apos;équipe à venir — ajoutez-la depuis l&apos;espace admin.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QUICK FACTS */}
      <section className="border-b border-black/5 bg-ibc-accent/10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 text-center sm:grid-cols-4">
          <Fact label="Ligue" value="2ème Ligue Cantonale" />
          <Fact label="Fédération" value="A.C.G.B.A." />
          <Fact label="Entraînements" value="Lun & Jeu · 20h–22h" />
          <Fact label="Saison" value={settings.season_label} />
        </div>
      </section>

      {/* ANNOUNCEMENTS */}
      {announcements.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-bold uppercase text-ibc-blue">Annonces</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {announcements.map((a) => (
              <article
                key={a.id}
                className="rounded-xl border border-black/5 bg-white p-5 shadow-sm ring-1 ring-black/5"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-ibc-blue/70">
                  {new Date(a.created_at).toLocaleDateString("fr-CH")}
                </p>
                <h3 className="mt-1 font-display text-xl font-bold text-ibc-ink">{a.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-ibc-ink/75">{a.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* PRACTICE / SCHEDULE + MAP */}
      <section className="bg-ibc-blue/5 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-ibc-blue">
              Prochains rendez-vous
            </h2>
            <ul className="mt-6 space-y-3">
              {upcoming.length === 0 && (
                <li className="text-sm text-ibc-ink/60">Aucun événement à venir pour le moment.</li>
              )}
              {upcoming.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="font-semibold capitalize text-ibc-ink">
                      {formatDate(p.practice_date)}
                    </p>
                    <p className="text-sm text-ibc-ink/60">
                      {p.start_time}–{p.end_time} · {p.kind === "game" ? `Match${p.opponent ? " vs " + p.opponent : ""}` : "Entraînement"}
                    </p>
                  </div>
                  <a
                    href={`/api/calendar/${p.id}.ics`}
                    className="shrink-0 rounded-full border-2 border-ibc-blue px-3 py-1.5 text-xs font-bold uppercase text-ibc-blue transition hover:bg-ibc-blue hover:text-white"
                  >
                    + Agenda
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/calendrier"
                className="rounded-full bg-ibc-blue px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:brightness-110"
              >
                Calendrier complet
              </Link>
              <a
                href="/api/calendar.ics"
                className="rounded-full border-2 border-ibc-blue px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ibc-blue transition hover:bg-ibc-blue hover:text-white"
              >
                S&apos;abonner au calendrier
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold uppercase text-ibc-blue">
              Lieu d&apos;entraînement
            </h3>
            <p className="mt-2 text-sm text-ibc-ink/70">
              {settings.practice_location_name} — {settings.practice_location_address}
            </p>
            <PracticeMap address={settings.practice_location_address} />
          </div>
        </div>
      </section>

      {/* CLUB INFO */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-ibc-blue">Le club</h2>
            <p className="mt-4 whitespace-pre-line text-ibc-ink/75">{settings.club_about}</p>
          </div>
          {topPlayers.length > 0 && (
            <div>
              <h3 className="font-display text-xl font-bold uppercase text-ibc-blue">
                Meilleurs marqueurs
              </h3>
              <ul className="mt-4 space-y-2">
                {topPlayers.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-ibc-blue/5 px-4 py-2.5"
                  >
                    <span className="font-semibold text-ibc-ink">
                      <span className="mr-2 text-ibc-accent-deep">#{i + 1}</span>
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="text-sm text-ibc-ink/60">{p.ppg} pts/match</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/equipe"
                className="mt-4 inline-block text-sm font-bold uppercase text-ibc-blue hover:underline"
              >
                Voir toute l&apos;équipe →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <p className="font-display text-lg font-bold uppercase text-ibc-blue sm:text-xl">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ibc-ink/60">{label}</p>
    </div>
  );
}

function CourtLines() {
  return (
    <svg viewBox="0 0 800 400" className="h-full w-full">
      <rect x="10" y="10" width="780" height="380" fill="none" stroke="white" strokeWidth="4" />
      <circle cx="400" cy="200" r="60" fill="none" stroke="white" strokeWidth="4" />
      <line x1="400" y1="10" x2="400" y2="390" stroke="white" strokeWidth="4" />
      <path d="M 10,120 A 190,190 0 0 1 10,280" fill="none" stroke="white" strokeWidth="4" />
      <path d="M 790,120 A 190,190 0 0 0 790,280" fill="none" stroke="white" strokeWidth="4" />
    </svg>
  );
}
