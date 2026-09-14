import { query } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { sanitizePlayers } from "@/lib/player-privacy";
import { withPhotoUrls } from "@/lib/media";
import MembersSearch from "@/components/MembersSearch";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Players & Members",
  description:
    "Meet the players of International Geneva Basketball Club (IBBC) across our men's, women's and youth teams — profiles, positions and season statistics.",
  path: "/membres/",
});

export default async function MembersPage() {
  // These rows are handed to a client component, so every column ends up
  // in the page payload — strip contact details for logged-out visitors.
  const canSeeContact = await isAuthenticated();
  const players = withPhotoUrls(sanitizePlayers(
    query(
      `SELECT players.*, teams.name as team_name, teams.category as team_category
       FROM players LEFT JOIN teams ON teams.id = players.team_id
       WHERE players.active = 1
       ORDER BY players.last_name ASC, players.first_name ASC`
    ),
    canSeeContact
  ));
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
