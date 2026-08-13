import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

const FIELDS = [
  "kind",
  "title",
  "practice_date",
  "start_time",
  "end_time",
  "location_name",
  "location_address",
  "opponent",
  "notes",
];

export const dynamic = "force-dynamic";

async function assertOwnsTeamOrAdmin(practiceId) {
  const session = await getSession();
  if (session.role === "admin") return null;
  const practice = get("SELECT team_id FROM practices WHERE id = ?", [practiceId]);
  if (!practice) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  if (practice.team_id !== session.team_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PUT(request, { params }) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;
  const scopeError = await assertOwnsTeamOrAdmin(params.id);
  if (scopeError) return scopeError;

  const body = await request.json();
  const sets = [];
  const values = [];
  for (const f of FIELDS) {
    if (f in body) {
      sets.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  values.push(params.id);
  run(`UPDATE practices SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;
  const scopeError = await assertOwnsTeamOrAdmin(params.id);
  if (scopeError) return scopeError;

  run("DELETE FROM practices WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
