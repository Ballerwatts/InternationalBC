import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireUser } from "@/lib/api-auth";
import { clearAbsenceWindow } from "@/lib/absences";

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
  let coachOwnsIt = false;
  if (user.role === "coach") {
    const target = get("SELECT team_id FROM players WHERE id = ?", [entry.player_id]);
    coachOwnsIt = !!target && target.team_id === user.team_id;
  }
  if (user.role !== "admin" && !ownsIt && !coachOwnsIt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Withdraw the presence marks this declaration wrote, but leave anything
  // set by hand alone — "I declared I was away, then said I'd make Thursday"
  // must survive deleting the travel entry.
  const withdrawn = clearAbsenceWindow(id);

  run("DELETE FROM availability WHERE id = ?", [id]);
  return NextResponse.json({ ok: true, withdrawn });
}
