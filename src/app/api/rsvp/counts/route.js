import { NextResponse } from "next/server";
import { get, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Aggregate present/absent headcounts per practice, scoped to one team, so
// players can see "5 in, 2 out" for their own squad without exposing every
// other team's RSVPs or who specifically answered what. Players/coaches are
// locked to their own team_id; only admins may pass a different team_id.
export async function GET(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const user = get("SELECT * FROM users WHERE id = ?", [Number(session.sub)]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedTeamId = searchParams.get("team_id");
  const teamId = user.role === "admin" ? requestedTeamId ? Number(requestedTeamId) : null : user.team_id;

  if (!teamId) return NextResponse.json({});

  const rows = query(
    `SELECT r.practice_id, r.status, COUNT(*) as c
     FROM practice_rsvp r
     JOIN users u ON u.id = r.user_id
     WHERE u.team_id = ? AND u.role = 'player' AND u.active = 1
     GROUP BY r.practice_id, r.status`,
    [teamId]
  );

  const counts = {};
  for (const row of rows) {
    counts[row.practice_id] = counts[row.practice_id] || { in: 0, out: 0 };
    counts[row.practice_id][row.status] = row.c;
  }

  return NextResponse.json(counts);
}
