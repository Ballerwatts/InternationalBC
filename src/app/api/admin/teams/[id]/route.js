import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { name, category } = await request.json();
  run("UPDATE teams SET name = ?, category = ? WHERE id = ?", [name, category || null, params.id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  run("DELETE FROM teams WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
