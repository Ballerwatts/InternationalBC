import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(query("SELECT * FROM plays ORDER BY updated_at DESC"));
}

export async function POST(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const { name, category, diagram_json } = await request.json();
  if (!name || !diagram_json) {
    return NextResponse.json({ error: "name et diagram_json sont requis" }, { status: 400 });
  }

  const { lastInsertRowid } = run(
    "INSERT INTO plays (name, category, diagram_json) VALUES (?, ?, ?)",
    [name, category || "offense", diagram_json]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
