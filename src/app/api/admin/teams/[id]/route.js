import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const { name, category, practice_location_name, practice_location_address, sort_order } =
    await request.json();
  const sets = ["name = ?", "category = ?", "practice_location_name = ?", "practice_location_address = ?"];
  const values = [name, category || null, practice_location_name || null, practice_location_address || null];
  if (sort_order !== undefined) {
    sets.push("sort_order = ?");
    values.push(Number(sort_order));
  }
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
