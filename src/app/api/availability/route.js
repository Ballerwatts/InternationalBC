import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";
import { applyAbsenceWindow } from "@/lib/absences";

export const dynamic = "force-dynamic";

// Resolves the logged-in user's row (including their linked player_id, if any).
async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  return get("SELECT * FROM users WHERE id = ?", [Number(session.sub)]);
}

// Admins see every entry (joined with player name); everyone else sees
// their own squad's — enforced here, not just hidden in the UI. Deleting
// and editing stay restricted to the owner and staff (see [id]/route.js).
export async function GET() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (user.role === "admin") {
    return NextResponse.json(
      query(
        `SELECT a.*, p.first_name, p.last_name
         FROM availability a
         JOIN players p ON p.id = a.player_id
         ORDER BY a.start_date ASC`
      )
    );
  }

  if (user.role === "coach") {
    return NextResponse.json(
      query(
        `SELECT a.*, p.first_name, p.last_name
         FROM availability a
         JOIN players p ON p.id = a.player_id
         WHERE p.team_id IS ?
         ORDER BY a.start_date ASC`,
        [user.team_id ?? null]
      )
    );
  }

  // A player sees their own squad's declarations, name and reason
  // included. That is a deliberate call by the club: the point of the
  // board is that the whole squad can see who is away for Thursday, and a
  // reason nobody can read just produces "why is he out?" in the group
  // chat. A player with no squad falls back to their own rows only.
  if (user.team_id) {
    return NextResponse.json(
      query(
        `SELECT a.*, p.first_name, p.last_name
         FROM availability a
         JOIN players p ON p.id = a.player_id
         WHERE p.team_id IS ?
         ORDER BY a.start_date ASC`,
        [user.team_id]
      )
    );
  }

  if (!user.player_id) {
    return NextResponse.json([]);
  }

  return NextResponse.json(
    query(
      "SELECT * FROM availability WHERE player_id = ? ORDER BY start_date ASC",
      [user.player_id]
    )
  );
}

export async function POST(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { start_date, end_date, reason, note } = body;

  if (!start_date || !end_date) {
    return NextResponse.json({ error: "dates de début et de fin requises" }, { status: 400 });
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: "la date de fin doit suivre la date de début" }, { status: 400 });
  }

  // Players can only ever declare unavailability for themselves. Admins may
  // pass a player_id to add an entry on any player's behalf; coaches may do
  // the same, but only for a player on their own team.
  let player_id;
  if (user.role === "admin") {
    player_id = body.player_id;
    if (!player_id) {
      return NextResponse.json({ error: "joueur requis" }, { status: 400 });
    }
  } else if (user.role === "coach") {
    player_id = body.player_id;
    if (!player_id) {
      return NextResponse.json({ error: "joueur requis" }, { status: 400 });
    }
    const target = get("SELECT team_id FROM players WHERE id = ?", [player_id]);
    if (!target || target.team_id !== user.team_id) {
      return NextResponse.json({ error: "ce joueur n'est pas dans votre équipe" }, { status: 401 });
    }
  } else {
    if (!user.player_id) {
      return NextResponse.json(
        { error: "votre compte n'est pas lié à un profil joueur — contactez l'entraîneur" },
        { status: 400 }
      );
    }
    player_id = user.player_id;
  }

  const { lastInsertRowid } = run(
    `INSERT INTO availability (player_id, start_date, end_date, reason, note)
     VALUES (?, ?, ?, ?, ?)`,
    [player_id, start_date, end_date, reason || "voyage", note || null]
  );

  // Immediately mark the player absent on every session the window covers,
  // so headcounts are right without anyone clicking event by event.
  const marked = applyAbsenceWindow({
    availabilityId: lastInsertRowid,
    playerId: player_id,
    startDate: start_date,
    endDate: end_date,
  });

  return NextResponse.json({ ok: true, id: lastInsertRowid, marked });
}
