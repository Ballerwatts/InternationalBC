import { query } from "@/lib/db";
import MembersSearch from "@/components/MembersSearch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members — International Basketball Club Geneva" };

export default function MembersPage() {
  const players = query(
    `SELECT players.*, teams.name as team_name, teams.category as team_category
     FROM players LEFT JOIN teams ON teams.id = players.team_id
     WHERE players.active = 1
     ORDER BY players.last_name ASC, players.first_name ASC`
  );
  const teams = query("SELECT * FROM teams ORDER BY sort_order ASC, name ASC");

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <header className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ibc-blue/70">
          Season 2026–2027
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">
          Players &amp; Members
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ibc-ink/70">
          Browse every player and member across IBBC&apos;s four squads. Search by name or team.
        </p>
      </header>

      <MembersSearch players={players} teams={teams} />
    </div>
  );
}
