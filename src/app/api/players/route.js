import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    query("SELECT * FROM players ORDER BY sort_order ASC, last_name ASC")
  );
}

export async function POST(request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const p = await request.json();
  if (!p.first_name || !p.last_name) {
    return NextResponse.json({ error: "Prénom et nom sont requis" }, { status: 400 });
  }

  const maxOrder = query("SELECT COALESCE(MAX(sort_order), -1) as m FROM players")[0].m;

  const { lastInsertRowid } = run(
    `INSERT INTO players
      (first_name, last_name, jersey_number, license_number, email, phone, photo_data_url, position, games_played, total_points, ppg, active, sort_order, team_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
