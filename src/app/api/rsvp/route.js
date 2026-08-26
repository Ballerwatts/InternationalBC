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
// view; coaches see every RSVP for their own team's roster, so they can
// tag presence on a player's behalf; players only ever see their own —
// enforced here, not just hidden in the UI.
export async function GET() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (user.role === "admin") {
    return NextResponse.json(
      query(
        `SELECT r.*, u.name as user_name, u.player_id, m.name as marked_by_name
         FROM practice_rsvp r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN users m ON m.id = r.marked_by
         ORDER BY r.practice_id ASC`
      )
    );
  }

  if (user.role === "coach") {
    return NextResponse.json(
      query(
        `SELECT r.*, u.name as user_name, u.player_id, m.name as marked_by_name
         FROM practice_rsvp r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN users m ON m.id = r.marked_by
         WHERE u.team_id IS ?
         ORDER BY r.practice_id ASC`,
        [user.team_id ?? null]
      )
    );
  }

  // A player reads their own squad's marks — that is the locker-room
  // whiteboard, and it is what makes the register and the headcounts
  // readable for them. `note` and `marked_by` are deliberately NOT
  // selected: the reason someone is away (injury, travel) stays between
  // that player and the staff.
  if (user.team_id) {
    return NextResponse.json(
      query(
        `SELECT r.id, r.practice_id, r.user_id, r.status, r.availability_id, r.updated_at,
                u.name as user_name, u.player_id
         FROM practice_rsvp r
         JOIN users u ON u.id = r.user_id
         WHERE u.team_id IS ?
         ORDER BY r.practice_id ASC`,
        [user.team_id]
      )
    );
  }

  return NextResponse.json(
    query(
      `SELECT r.*, m.name as marked_by_name
       FROM practice_rsvp r
       LEFT JOIN users m ON m.id = r.marked_by
       WHERE r.user_id = ?`,
      [user.id]
    )
  );
}

// Upsert a RSVP for one practice. By default this is the logged-in user's
// own mark; admins can pass user_id to tag any player, coaches can pass
// user_id to tag any player on their own team (enforced server-side, not
// just hidden in the UI).
export async function POST(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { practice_id, status, note, user_id } = await request.json();
  if (!practice_id || !["in", "out"].includes(status)) {
    return NextResponse.json({ error: "practice_id et status ('in'|'out') requis" }, { status: 400 });
  }

  const targetUserId = await resolveTargetUserId(user, user_id);
  if (targetUserId instanceof NextResponse) return targetUserId;

  // availability_id is set to NULL on purpose: this mark was clicked by a
  // human, so deleting a declared absence must never withdraw it again.
  // See src/lib/absences.js for the two-state contract.
  // NULL when someone marks themselves; the acting user's id when a coach or
  // admin marks on a player's behalf. The mark counts the same either way —
  // this only records who made it, which is what the register shows as
  // "noté par …". That branch existed and rendered nothing, because the
  // column was declared and migrated but never written.
  const markedBy = Number(targetUserId) === Number(user.id) ? null : user.id;

  run(
    `INSERT INTO practice_rsvp (practice_id, user_id, status, note, availability_id, marked_by, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, datetime('now'))
     ON CONFLICT(practice_id, user_id) DO UPDATE SET
       status = excluded.status,
       note = excluded.note,
       availability_id = NULL,
       marked_by = excluded.marked_by,
       updated_at = datetime('now')`,
    [practice_id, targetUserId, status, note || null, markedBy]
  );

  return NextResponse.json({ ok: true });
}

// Clear a mark back to "no response" — same authorization rules as POST.
export async function DELETE(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { practice_id, user_id } = await request.json();
  if (!practice_id) {
    return NextResponse.json({ error: "practice_id requis" }, { status: 400 });
  }

  const targetUserId = await resolveTargetUserId(user, user_id);
  if (targetUserId instanceof NextResponse) return targetUserId;

  run("DELETE FROM practice_rsvp WHERE practice_id = ? AND user_id = ?", [practice_id, targetUserId]);
  return NextResponse.json({ ok: true });
}

// Admin may target anyone; coach may only target a player on their own
// team; anyone else may only ever target themselves.
async function resolveTargetUserId(user, requestedUserId) {
  if (!requestedUserId || requestedUserId === user.id) return user.id;

  if (user.role === "admin") return requestedUserId;

  if (user.role === "coach") {
    const target = get("SELECT team_id FROM users WHERE id = ?", [requestedUserId]);
    if (!target || target.team_id !== user.team_id) {
      return NextResponse.json({ error: "ce joueur n'est pas dans votre équipe" }, { status: 401 });
    }
    return requestedUserId;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
