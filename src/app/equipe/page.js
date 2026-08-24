import Link from "next/link";
import { query } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { sanitizePlayers } from "@/lib/player-privacy";
import TeamAccordion from "@/components/TeamAccordion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teams — International Basketball Club Geneva (IBBC)" };

export default async function TeamPage() {
  const teams = query("SELECT * FROM teams ORDER BY sort_order ASC, name ASC");
  // Rosters render in a client accordion — strip contact details unless the
  // visitor is a logged-in member.
  const canSeeContact = await isAuthenticated();
  const players = sanitizePlayers(
    query("SELECT * FROM players WHERE active = 1 ORDER BY sort_order ASC, last_name ASC"),
    canSeeContact
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
          the Geneva basketball leagues (ACGBA) from October to May. Tap a team to see its roster.
        </p>
      </header>

      <TeamAccordion teams={teams} players={players} unassigned={unassigned} />

      {players.length === 0 && (
        <p className="mt-10 text-center text-ibc-ink/60">No players yet.</p>
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
