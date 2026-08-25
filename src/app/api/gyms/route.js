import { NextResponse } from "next/server";
import { query, run, getGymsWithTeams, syncAllTeamPracticeLocations } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { replaceTeamLinks } from "@/lib/gyms";

export const dynamic = "force-dynamic";

/**
 * Public read: the Club page, the Teams page and the homepage all show which
 * squads train where, so visitors need this. Only writes are admin-only.
 */
export async function GET() {
  return NextResponse.json(getGymsWithTeams());
}

export async function POST(request) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Le nom de la salle est requis." }, { status: 400 });
  }

  const maxOrder = query("SELECT COALESCE(MAX(sort_order), -1) as m FROM gyms")[0].m;
  const { lastInsertRowid } = run(
    `INSERT INTO gyms (name, address, maps_url, notes, sort_order, photo_interior_data_url, photo_exterior_data_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      (body.address || "").trim() || null,
      (body.maps_url || "").trim() || null,
      (body.notes || "").trim() || null,
      maxOrder + 1,
      body.photo_interior_data_url || null,
      body.photo_exterior_data_url || null,
    ]
  );

  const gymId = Number(lastInsertRowid);
  replaceTeamLinks(gymId, body.teams);
  syncAllTeamPracticeLocations();

  return NextResponse.json({ ok: true, id: gymId });
}
