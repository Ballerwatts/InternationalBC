import { NextResponse } from "next/server";
import { getSlotsForTeam, replaceSlotsForTeam, toTeamId } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// A squad's weekly training pattern — which days, what times, which hall.
// Editable from the Calendar (organisation) and from a team's own page in
// Teams (marketing) — it is the same schedule either way.

function teamIdFrom(request, session) {
  // A coach only ever edits their own squad, whatever they send.
  if (session?.role !== "admin") return toTeamId(session?.team_id);
  return toTeamId(new URL(request.url).searchParams.get("team_id"));
}

export async function GET(request) {
  const denied = await requireArea("organisation", "marketing");
  if (denied) return denied;
  const session = await getSession();
  return NextResponse.json(getSlotsForTeam(teamIdFrom(request, session)));
}

export async function PUT(request) {
  const denied = await requireArea("organisation", "marketing");
  if (denied) return denied;
  const session = await getSession();
  const teamId = teamIdFrom(request, session);
  const { slots } = await request.json();

  if (!Array.isArray(slots)) {
    return NextResponse.json({ error: "slots doit être une liste" }, { status: 400 });
  }
  for (const s of slots) {
    if (!/^\d{2}:\d{2}$/.test(s?.start_time || "") || !/^\d{2}:\d{2}$/.test(s?.end_time || "")) {
      return NextResponse.json({ error: "Heures attendues au format HH:MM." }, { status: 400 });
    }
    if (s.end_time <= s.start_time) {
      return NextResponse.json(
        { error: "L'heure de fin doit suivre l'heure de début." },
        { status: 400 }
      );
    }
  }

  replaceSlotsForTeam(teamId, slots);
  return NextResponse.json({ ok: true, slots: getSlotsForTeam(teamId) });
}
