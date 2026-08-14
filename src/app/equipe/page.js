import Image from "next/image";
import Link from "next/link";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teams — International Basketball Club Geneva (IBBC)" };

export default function TeamPage() {
  const teams = query("SELECT * FROM teams ORDER BY sort_order ASC, name ASC");
  const players = query(
    "SELECT * FROM players WHERE active = 1 ORDER BY sort_order ASC, last_name ASC"
  );
  const unassigned = players.filter((p) => !p.team_id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <header className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ibc-blue/70">
          Season 2026–2027
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">Teams</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ibc-ink/70">
          International Basketball Club Geneva (IBBC) fields four squads — the IBBC Youth Men&apos;s
          Team (U18M), IBBC Women (NL1), IBBC Men (3LCM), and IBBC Men (2LCM) — all competing across
          the Geneva basketball leagues (ACGBA) from October to May.
        </p>
      </header>

      <div className="space-y-14">
        {teams.map((team) => {
          const roster = players.filter((p) => p.team_id === team.id);
          return (
            <section key={team.id}>
              <div className="mb-5 border-b border-ibc-blue/10 pb-2">
                <h2 className="font-display text-2xl font-extrabold uppercase text-ibc-blue">
                  {team.name}
                </h2>
                {team.category && <p className="text-sm text-ibc-ink/60">{team.category}</p>}
              </div>

              {roster.length === 0 ? (
                <p className="text-sm text-ibc-ink/50">Roster coming soon.</p>
              ) : (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                  {roster.map((p) => (
                    <PlayerCard key={p.id} p={p} />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {unassigned.length > 0 && (
          <section>
            <div className="mb-5 border-b border-ibc-blue/10 pb-2">
              <h2 className="font-display text-2xl font-extrabold uppercase text-ibc-blue">
                Other players
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {unassigned.map((p) => (
                <PlayerCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {players.length === 0 && (
        <p className="text-center text-ibc-ink/60">No players yet.</p>
      )}

      <p className="mt-14 text-center text-sm text-ibc-ink/60">
        Looking for a specific player?{" "}
        <Link href="/membres" className="font-semibold text-ibc-blue hover:underline">
          Search all members →
        </Link>
      </p>
    </div>
  );
}

function PlayerCard({ p }) {
  return (
    <Link
      href={`/membres/${p.id}`}
      className="group overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square bg-ibc-blue">
        {p.photo_data_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.photo_data_url}
            alt={`${p.first_name} ${p.last_name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Image src="/logo.png" alt="" width={64} height={64} className="opacity-60" />
          </div>
        )}
        {p.jersey_number && (
          <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ibc-accent font-display text-lg font-extrabold text-ibc-ink shadow">
            {p.jersey_number}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-base font-bold uppercase leading-tight text-ibc-ink">
          {p.first_name}
          <br />
          {p.last_name}
        </p>
        {p.position && <p className="text-xs text-ibc-ink/60">{p.position}</p>}
        <div className="mt-2 flex justify-between text-xs text-ibc-ink/60">
          <span>{p.games_played} games</span>
          <span className="font-semibold text-ibc-blue">{p.ppg} pts/g</span>
        </div>
      </div>
    </Link>
  );
}
