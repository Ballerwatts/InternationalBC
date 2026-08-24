import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { get, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const userCount = query("SELECT id FROM users LIMIT 1");

  // The linked player profile, read fresh rather than from the token: a
  // page that shows "which of these declared absences is mine" needs the
  // player id, and the session cookie predates that link being made.
  const row = session ? get("SELECT player_id FROM users WHERE id = ?", [Number(session.sub)]) : null;

  return NextResponse.json({
    authenticated: !!session,
    // The account id, so a client page can tell its own rows apart from
    // team-mates' in endpoints that return more than one user's rows.
    id: session?.sub != null ? Number(session.sub) : null,
    role: session?.role || null,
    name: session?.name || null,
    team_id: session?.team_id ?? null,
    player_id: row?.player_id ?? null,
    needsSetup: userCount.length === 0,
  });
}
