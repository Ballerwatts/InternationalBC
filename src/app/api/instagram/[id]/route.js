import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { normalizeInstagramUrl } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const existing = get("SELECT id FROM instagram_posts WHERE id = ?", [params.id]);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json();
  const updates = [];
  const values = [];

  if ("post_url" in body) {
    const url = normalizeInstagramUrl(body.post_url);
    if (!url) return NextResponse.json({ error: "Lien Instagram non reconnu." }, { status: 400 });
    updates.push("post_url = ?");
    values.push(url);
  }
  if ("caption" in body) {
    updates.push("caption = ?");
    values.push((body.caption || "").trim() || null);
  }
  if ("sort_order" in body) {
    updates.push("sort_order = ?");
    values.push(Number(body.sort_order) || 0);
  }
  if (!updates.length) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  values.push(params.id);
  run(`UPDATE instagram_posts SET ${updates.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  run("DELETE FROM instagram_posts WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
