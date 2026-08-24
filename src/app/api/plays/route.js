import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireStaff, requireUser } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Tactics are for the team only — not public — and scoped to the logged-in
// user's own squad (admins see everything). Staff (admin/coach) see every
// draft; players only ever see the plays staff have published (see
// /api/plays/[id] for the publish toggle, which is staff-only).
export async function GET(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const isStaff = session.role === "admin" || session.role === "coach";

  // Each squad has its own playbook. An admin works one squad at a time
  // (?team_id=), because a single list mixing four squads' plays is how a
  // U18 set ends up on the women's board; with no team_id they get the
  // unassigned/club-wide ones only.
  if (session.role === "admin") {
    const requested = new URL(request.url).searchParams.get("team_id");
    return NextResponse.json(
      query("SELECT * FROM plays WHERE team_id IS ? ORDER BY updated_at DESC", [
        requested ? Number(requested) : null,
      ])
    );
  }

  if (isStaff) {
    return NextResponse.json(
      query("SELECT * FROM plays WHERE team_id IS ? ORDER BY updated_at DESC", [session.team_id ?? null])
    );
  }

  return NextResponse.json(
    query("SELECT * FROM plays WHERE team_id IS ? AND published = 1 ORDER BY updated_at DESC", [
      session.team_id ?? null,
    ])
  );
}

// Creating a play is staff-only. Players read the playbook; they don't
// add to it, and they can't delete from it (see [id]/route.js).
export async function POST(request) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const { name, category, diagram_json, team_id } = await request.json();
  if (!name || !diagram_json) {
    return NextResponse.json({ error: "name et diagram_json sont requis" }, { status: 400 });
  }

  const targetTeamId = session.role === "admin" ? team_id ?? null : session.team_id ?? null;

  // Always starts as an unpublished draft — it has to be published
  // explicitly before the squad sees it.
  const { lastInsertRowid } = run(
    "INSERT INTO plays (name, category, diagram_json, team_id, published) VALUES (?, ?, ?, ?, 0)",
    [name, category || "offense", diagram_json, targetTeamId]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
