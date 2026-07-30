import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const play = get("SELECT * FROM plays WHERE id = ?", [params.id]);
  if (!play) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(play);
}

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { name, category, diagram_json } = await request.json();
  run(
    "UPDATE plays SET name = ?, category = ?, diagram_json = ?, updated_at = datetime('now') WHERE id = ?",
    [name, category || "offense", diagram_json, params.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  run("DELETE FROM plays WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
