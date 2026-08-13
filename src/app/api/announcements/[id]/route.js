import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { title, body, published } = await request.json();
  run("UPDATE announcements SET title = ?, body = ?, published = ?, updated_at = datetime('now') WHERE id = ?", [
    title,
    body,
    published ? 1 : 0,
    params.id,
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  run("DELETE FROM announcements WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
