import { NextResponse } from "next/server";
import { get, query, run, slugify } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

// Team list is needed by logged-in staff (to pick a team when approving a
// signup or creating a practice) and by the public site (the Équipe page
// groups rosters by team) — so GET is open, only writes are admin-only.
export async function GET() {
  return NextResponse.json(query("SELECT * FROM teams ORDER BY sort_order ASC, name ASC"));
}

export async function POST(request) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const { name, category, practice_location_name, practice_location_address } = await request.json();
  const cleanName = (name || "").trim();
  if (!cleanName) {
    return NextResponse.json({ error: "Le nom de l'équipe est requis." }, { status: 400 });
  }

  const maxOrder = query("SELECT COALESCE(MAX(sort_order), -1) as m FROM teams")[0].m;
  const { lastInsertRowid } = run(
    "INSERT INTO teams (name, category, sort_order, practice_location_name, practice_location_address) VALUES (?, ?, ?, ?, ?)",
    [cleanName, category || null, maxOrder + 1, practice_location_name || null, practice_location_address || null]
  );

  // Every team gets its own page address straight away, unique by suffix.
  let slug = slugify(cleanName) || `team-${lastInsertRowid}`;
  for (let n = 2; get("SELECT id FROM teams WHERE slug = ?", [slug]); n++) slug = `${slugify(cleanName)}-${n}`;
  run("UPDATE teams SET slug = ? WHERE id = ?", [slug, lastInsertRowid]);

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
