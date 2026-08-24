import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const { title, body, published, image_data_url } = await request.json();
  run(
    "UPDATE announcements SET title = ?, body = ?, published = ?, image_data_url = ?, updated_at = datetime('now') WHERE id = ?",
    [title, body, published ? 1 : 0, image_data_url || null, params.id]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  run("DELETE FROM announcements WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
