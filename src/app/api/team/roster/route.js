import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Active players for a team, joined to their login (if any) — this is
// what a coach/admin needs to tag presence on a player's behalf: the
// player's id for display, and the linked user's id to write the RSVP
// against. A player with no login yet still shows up (read-only, since
// there's no user_id to attach a mark to).
export async function GET(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const requestedTeamId = searchParams.get("team_id");

  // A coach — and now a player, who can read their squad's register and
  // availability — is always pinned to their own team; only an admin may
  // request any team, or omit team_id to see every active player.
  const teamId = session.role === "admin" ? requestedTeamId : session.team_id ?? null;

  const where = teamId ? "WHERE p.team_id = ? AND p.active = 1" : "WHERE p.active = 1";
  const params = teamId ? [Number(teamId)] : [];

  const roster = query(
    `SELECT p.id, p.first_name, p.last_name, p.jersey_number, p.team_id, u.id as user_id
     FROM players p
     LEFT JOIN users u ON u.player_id = p.id
     ${where}
     ORDER BY p.sort_order ASC, p.last_name ASC`,
    params
  );

  return NextResponse.json(roster);
}
