import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  return get("SELECT * FROM users WHERE id = ?", [Number(session.sub)]);
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = params;
  const entry = get("SELECT * FROM availability WHERE id = ?", [id]);
  if (!entry) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const ownsIt = user.role === "player" && user.player_id === entry.player_id;
  if (user.role !== "admin" && !ownsIt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  run("DELETE FROM availability WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
