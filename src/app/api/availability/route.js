import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Resolves the logged-in user's row (including their linked player_id, if any).
async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  return get("SELECT * FROM users WHERE id = ?", [Number(session.sub)]);
}

// Admins see every entry (joined with player name); players only ever see
// their own — enforced here, not just hidden in the UI.
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
  // pass a player_id to add an entry on a player's behalf.
  let player_id;
  if (user.role === "admin") {
    player_id = body.player_id;
    if (!player_id) {
      return NextResponse.json({ error: "joueur requis" }, { status: 400 });
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

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
