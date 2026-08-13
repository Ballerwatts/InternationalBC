import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const play = get("SELECT * FROM plays WHERE id = ?", [params.id]);
  if (!play) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(play);
}

export async function PUT(request, { params }) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const isStaff = session.role === "admin" || session.role === "coach";
  const body = await request.json();

  const sets = ["updated_at = datetime('now')"];
  const values = [];

  if ("name" in body || "category" in body || "diagram_json" in body) {
    sets.unshift("name = ?", "category = ?", "diagram_json = ?");
    values.push(body.name, body.category || "offense", body.diagram_json);
  }

  // Publishing/unpublishing is staff-only — players can draft and edit a
  // play's content, but can't choose to show it to the rest of the team.
  if ("published" in body) {
    if (!isStaff) {
      return NextResponse.json(
        { error: "Seuls les coachs/admins peuvent publier un schéma." },
        { status: 401 }
      );
    }
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

  run("DELETE FROM plays WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
