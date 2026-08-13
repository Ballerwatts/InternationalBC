import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(query("SELECT * FROM announcements ORDER BY created_at DESC"));
}

export async function POST(request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { title, body, published = 1 } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title et body sont requis" }, { status: 400 });
  }

  const { lastInsertRowid } = run(
    "INSERT INTO announcements (title, body, published) VALUES (?, ?, ?)",
    [title, body, published ? 1 : 0]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
