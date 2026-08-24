import { NextResponse } from "next/server";
import { run, get } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const denied = await requireArea("organisation");
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const sets = [];
  const values = [];

  for (const column of ["name", "email", "phone", "relation"]) {
    if (column in body) {
      sets.push(`${column} = ?`);
      values.push(body[column] || null);
    }
  }
  if ("receives_newsletter" in body) {
    sets.push("receives_newsletter = ?");
    values.push(body.receives_newsletter ? 1 : 0);
  }
  if (!sets.length) return NextResponse.json({ ok: true, unchanged: true });

  values.push(params.id);
  run(`UPDATE player_guardians SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json(get("SELECT * FROM player_guardians WHERE id = ?", [params.id]));
}

export async function DELETE(request, { params }) {
  const denied = await requireArea("organisation");
  if (denied) return denied;

  run("DELETE FROM player_guardians WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
