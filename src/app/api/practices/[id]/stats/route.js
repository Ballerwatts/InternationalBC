import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireStaff } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Points scored per player in one game. Staff only; a coach is limited to
// games belonging to their own squad (or club-wide ones).
async function assertCanEdit(practiceId) {
  const session = await getSession();
  const game = get("SELECT id, team_id, kind FROM practices WHERE id = ?", [practiceId]);
  if (!game) return { error: NextResponse.json({ error: "introuvable" }, { status: 404 }) };
  // Same rule as editing the event itself (see ../route.js): a coach owns
  // their squad's games and nothing else.
  if (session.role !== "admin" && game.team_id !== session.team_id) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { game };
}

export async function GET(request, { params }) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const { error } = await assertCanEdit(params.id);
  if (error) return error;

  return NextResponse.json(
    query(
      `SELECT g.*, p.first_name, p.last_name
       FROM game_stats g JOIN players p ON p.id = g.player_id
       WHERE g.practice_id = ?`,
      [params.id]
    )
  );
}

// Body: { stats: [{ player_id, points }] }. Replaces the box score for this
// game wholesale — a player left out of the list is removed from it, which
// is what "he didn't play" means.
export async function PUT(request, { params }) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const { error } = await assertCanEdit(params.id);
  if (error) return error;

  const { stats } = await request.json();
  if (!Array.isArray(stats)) {
    return NextResponse.json({ error: "stats doit être une liste" }, { status: 400 });
  }

  const keep = [];
  for (const s of stats) {
    const playerId = Number(s.player_id);
    if (!playerId) continue;
    const points = Number.isFinite(Number(s.points)) ? Math.max(0, Number(s.points)) : 0;
    keep.push(playerId);
    run(
      `INSERT INTO game_stats (practice_id, player_id, points, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(practice_id, player_id) DO UPDATE SET
         points = excluded.points, updated_at = datetime('now')`,
      [params.id, playerId, points]
    );
  }

  const existing = query("SELECT player_id FROM game_stats WHERE practice_id = ?", [params.id]);
  for (const row of existing) {
    if (!keep.includes(row.player_id)) {
      run("DELETE FROM game_stats WHERE practice_id = ? AND player_id = ?", [
        params.id,
        row.player_id,
      ]);
    }
  }

  return NextResponse.json({ ok: true, recorded: keep.length });
}
