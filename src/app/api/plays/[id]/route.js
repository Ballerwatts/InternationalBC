import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Can this session touch this play?
 *
 * Previously every method here only checked "is anyone logged in", which
 * meant any player of any squad could edit or delete any other squad's
 * plays by id. Now: admins anywhere, a coach only inside their own squad,
 * players never.
 */
async function canWrite(play) {
  const session = await getSession();
  if (!session) return false;
  if (session.role === "admin") return true;
  if (session.role !== "coach") return false;
  return (play.team_id ?? null) === (session.team_id ?? null);
}

/** Reading is squad-scoped too, and players only ever see published plays. */
async function canRead(play) {
  const session = await getSession();
  if (!session) return false;
  if (session.role === "admin") return true;
  if ((play.team_id ?? null) !== (session.team_id ?? null)) return false;
  if (session.role === "coach") return true;
  return !!play.published;
}

export async function GET(request, { params }) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const play = get("SELECT * FROM plays WHERE id = ?", [params.id]);
  if (!play) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canRead(play))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(play);
}

export async function PUT(request, { params }) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const play = get("SELECT * FROM plays WHERE id = ?", [params.id]);
  if (!play) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canWrite(play))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const sets = ["updated_at = datetime('now')"];
  const values = [];

  if ("name" in body || "category" in body || "diagram_json" in body) {
    sets.unshift("name = ?", "category = ?", "diagram_json = ?");
    values.push(body.name, body.category || "offense", body.diagram_json);
  }

  if ("published" in body) {
    sets.unshift("published = ?");
    values.unshift(body.published ? 1 : 0);
  }

  values.push(params.id);
  run(`UPDATE plays SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const play = get("SELECT * FROM plays WHERE id = ?", [params.id]);
  if (!play) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canWrite(play))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  run("DELETE FROM plays WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
