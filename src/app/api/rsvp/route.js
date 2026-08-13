import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Per-practice RSVP ("tableau d'entraînement" personal mark) — distinct
// from the /api/availability travel-declaration feature, which covers
// multi-day absence windows. This is a lightweight in/out toggle per
// practice/game.

async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  return get("SELECT * FROM users WHERE id = ?", [Number(session.sub)]);
}

// Admins see every RSVP (joined with the player's name) for a headcount
// view; players only ever see their own — enforced here, not just hidden
// in the UI.
export async function GET() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (user.role === "admin") {
    return NextResponse.json(
      query(
        `SELECT r.*, u.name as user_name, u.player_id
         FROM practice_rsvp r
         JOIN users u ON u.id = r.user_id
         ORDER BY r.practice_id ASC`
      )
    );
  }

  return NextResponse.json(query("SELECT * FROM practice_rsvp WHERE user_id = ?", [user.id]));
}

// Upsert the logged-in user's own RSVP for one practice.
export async function POST(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { practice_id, status, note } = await request.json();
  if (!practice_id || !["in", "out"].includes(status)) {
    return NextResponse.json({ error: "practice_id et status ('in'|'out') requis" }, { status: 400 });
  }

  run(
    `INSERT INTO practice_rsvp (practice_id, user_id, status, note, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(practice_id, user_id) DO UPDATE SET
       status = excluded.status, note = excluded.note, updated_at = datetime('now')`,
    [practice_id, user.id, status, note || null]
  );

  return NextResponse.json({ ok: true });
}
