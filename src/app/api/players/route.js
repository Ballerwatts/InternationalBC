import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { isAuthenticated } from "@/lib/auth";
import { sanitizePlayers } from "@/lib/player-privacy";

export const dynamic = "force-dynamic";

// Public endpoint (the roster is public), but e-mail, phone, licence
// number and the per-player due override are stripped for anyone who
// isn't a logged-in member.
export async function GET() {
  const canSeeContact = await isAuthenticated();
  return NextResponse.json(
    sanitizePlayers(
      query("SELECT * FROM players ORDER BY sort_order ASC, last_name ASC"),
      canSeeContact
    )
  );
}

export async function POST(request) {
  const unauthorized = await requireArea("organisation");
  if (unauthorized) return unauthorized;

  const p = await request.json();
  if (!p.first_name || !p.last_name) {
    return NextResponse.json({ error: "Prénom et nom sont requis" }, { status: 400 });
  }

  const maxOrder = query("SELECT COALESCE(MAX(sort_order), -1) as m FROM players")[0].m;

  const { lastInsertRowid } = run(
    `INSERT INTO players
      (first_name, last_name, jersey_number, license_number, email, phone, photo_data_url, position, games_played, total_points, ppg, active, sort_order, team_id, bio, nationality, birth_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.first_name,
      p.last_name,
      p.jersey_number || null,
      p.license_number || null,
      p.email || null,
      p.phone || null,
      p.photo_data_url || null,
      p.position || null,
      p.games_played || 0,
      p.total_points || 0,
      p.ppg || 0,
      p.active === false ? 0 : 1,
      maxOrder + 1,
      p.team_id || null,
      p.bio || null,
      p.nationality || null,
      p.birth_date || null,
    ]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
