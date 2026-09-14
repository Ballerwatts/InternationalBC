import { NextResponse } from "next/server";
import { get, run, slugify } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

// Only fields present in the body are written. It used to set every column on
// every call, so a caller sending part of a team would have blanked the rest.
const TEXT_FIELDS = ["category", "practice_location_name", "practice_location_address", "description"];

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const sets = [];
  const values = [];

  if ("name" in body) {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
    sets.push("name = ?");
    values.push(name);
  }
  for (const f of TEXT_FIELDS) {
    if (f in body) {
      sets.push(`${f} = ?`);
      values.push(String(body[f] ?? "").trim() || null);
    }
  }
  if ("sort_order" in body && body.sort_order !== undefined) {
    sets.push("sort_order = ?");
    values.push(Number(body.sort_order));
  }

  // The slug is the team page's public address, /teams/<slug>/. Changing it
  // breaks every link to the old one, so it is normalised and must be unique.
  if ("slug" in body) {
    const slug = slugify(body.slug);
    if (!slug) return NextResponse.json({ error: "L'adresse de la page ne peut pas être vide." }, { status: 400 });
    const clash = get("SELECT id FROM teams WHERE slug = ? AND id != ?", [slug, Number(params.id)]);
    if (clash) return NextResponse.json({ error: `L'adresse /teams/${slug}/ est déjà utilisée.` }, { status: 409 });
    sets.push("slug = ?");
    values.push(slug);
  }

  if (sets.length === 0) return NextResponse.json({ ok: true, unchanged: true });
  values.push(params.id);
  run(`UPDATE teams SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  run("DELETE FROM teams WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
