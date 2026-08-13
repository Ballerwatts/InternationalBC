import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Tactics are for the team only — not published publicly — and scoped to
// the logged-in user's own squad (admins see everything).
export async function GET() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  if (session.role === "admin") {
    return NextResponse.json(query("SELECT * FROM plays ORDER BY updated_at DESC"));
  }

  return NextResponse.json(
    query("SELECT * FROM plays WHERE team_id IS ? ORDER BY updated_at DESC", [session.team_id ?? null])
  );
}

export async function POST(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const { name, category, diagram_json, team_id } = await request.json();
  if (!name || !diagram_json) {
    return NextResponse.json({ error: "name et diagram_json sont requis" }, { status: 400 });
  }

  const targetTeamId = session.role === "admin" ? team_id ?? null : session.team_id ?? null;

  const { lastInsertRowid } = run(
    "INSERT INTO plays (name, category, diagram_json, team_id) VALUES (?, ?, ?, ?)",
    [name, category || "offense", diagram_json, targetTeamId]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
