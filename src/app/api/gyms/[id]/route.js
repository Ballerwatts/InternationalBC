import { NextResponse } from "next/server";
import { run, get, getAllSettings, setSetting, syncAllTeamPracticeLocations } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { replaceTeamLinks } from "@/lib/gyms";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const id = Number(params.id);
  const body = await request.json();
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Le nom de la salle est requis." }, { status: 400 });
  }

  const sets = ["name = ?", "address = ?", "maps_url = ?", "notes = ?"];
  const values = [
    name,
    (body.address || "").trim() || null,
    (body.maps_url || "").trim() || null,
    (body.notes || "").trim() || null,
  ];
  // Photos are only touched when the client sends them, so a reorder (which
  // posts the row back without images) cannot wipe them.
  if ("photo_interior_data_url" in body) {
    sets.push("photo_interior_data_url = ?");
    values.push(body.photo_interior_data_url || null);
  }
  if ("photo_exterior_data_url" in body) {
    sets.push("photo_exterior_data_url = ?");
    values.push(body.photo_exterior_data_url || null);
  }
  if (body.sort_order !== undefined) {
    sets.push("sort_order = ?");
    values.push(Number(body.sort_order));
  }
  values.push(id);
  run(`UPDATE gyms SET ${sets.join(", ")} WHERE id = ?`, values);

  replaceTeamLinks(id, body.teams);
  syncAllTeamPracticeLocations();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const id = Number(params.id);
  // team_gyms rows go with it via ON DELETE CASCADE. If this was the gym the
  // homepage points at, clear the pointer rather than leave a dangling id —
  // getHomeGym() then falls back to the first remaining gym.
  run("DELETE FROM gyms WHERE id = ?", [id]);
  if (Number(getAllSettings().home_gym_id) === id) setSetting("home_gym_id", "");
  syncAllTeamPracticeLocations();

  return NextResponse.json({ ok: true });
}

export async function GET(request, { params }) {
  return NextResponse.json(get("SELECT * FROM gyms WHERE id = ?", [Number(params.id)]) || {});
}
