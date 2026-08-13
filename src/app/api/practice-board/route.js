import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireStaff, requireUser } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The practice board is team-only, not public — see /api-auth requireUser.
export async function GET() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  if (session.role === "admin") {
    return NextResponse.json(query("SELECT * FROM practice_board ORDER BY week_start_date DESC"));
  }

  return NextResponse.json(
    query("SELECT * FROM practice_board WHERE team_id IS ? ORDER BY week_start_date DESC", [
      session.team_id ?? null,
    ])
  );
}

export async function POST(request) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const { week_start_date, focus, drills, notes, team_id } = await request.json();
  if (!week_start_date) {
    return NextResponse.json({ error: "week_start_date requis" }, { status: 400 });
  }

  const targetTeamId = session.role === "admin" ? team_id ?? null : session.team_id ?? null;

  const { lastInsertRowid } = run(
    "INSERT INTO practice_board (week_start_date, focus, drills, notes, team_id) VALUES (?, ?, ?, ?, ?)",
    [week_start_date, focus || "", drills || "", notes || "", targetTeamId]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
