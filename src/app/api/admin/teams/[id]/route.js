import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { name, category, practice_location_name, practice_location_address } = await request.json();
  run(
    "UPDATE teams SET name = ?, category = ?, practice_location_name = ?, practice_location_address = ? WHERE id = ?",
    [name, category || null, practice_location_name || null, practice_location_address || null, params.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  run("DELETE FROM teams WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
