import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import { applyAbsencesToPractice } from "@/lib/absences";
import { isSupportedVideoUrl } from "@/lib/video";

export const dynamic = "force-dynamic";

// The calendar stays public (all squads) — only tactics and the practice
// board are hidden from visitors. Pass ?team_id= to scope to one squad.
// Pass ?include_club=1 alongside team_id to also include club-wide events
// (team_id IS NULL) — used by the logged-in player calendar, which should
// show the player's own team's events plus anything scheduled for the
// whole club.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const teamId = searchParams.get("team_id");
  const includeClub = searchParams.get("include_club");

  const clauses = [];
  const params = [];
  if (from) {
    clauses.push("practice_date >= ?");
    params.push(from);
  }
  if (teamId) {
    if (includeClub) {
      clauses.push("(team_id = ? OR team_id IS NULL)");
    } else {
      clauses.push("team_id = ?");
    }
    params.push(Number(teamId));
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return NextResponse.json(
    query(`SELECT * FROM practices ${where} ORDER BY practice_date ASC, start_time ASC`, params)
  );
}

export async function POST(request) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const body = await request.json();

  // Coaches can only ever write to their own team; admins may target any team.
  const teamId = session.role === "admin" ? body.team_id ?? null : session.team_id ?? null;

  if (body.action === "generate_weeks") {
    return generateWeeks({ ...body, teamId });
  }

  const { kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes, video_url } = body;
  if (!isSupportedVideoUrl(video_url)) {
    return NextResponse.json(
      { error: "Lien vidéo non reconnu — collez une URL YouTube ou Vimeo." },
      { status: 400 }
    );
  }
  if (!practice_date || !start_time || !end_time) {
    return NextResponse.json({ error: "date, heure de début et de fin requises" }, { status: 400 });
  }

  const { lastInsertRowid } = run(
    `INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes, video_url, team_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      kind || "practice",
      title || (kind === "game" ? "Match" : "Entraînement"),
      practice_date,
      start_time,
      end_time,
      location_name || null,
      location_address || null,
      opponent || null,
      notes || null,
      (video_url || "").trim() || null,
      teamId,
    ]
  );

  // A session added inside a window someone already declared should show
  // them absent straight away, not as unanswered.
  applyAbsencesToPractice(lastInsertRowid);

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}

function generateWeeks({ weeks = 12, location_name, location_address, teamId }) {
  const existing = new Set(
    query("SELECT practice_date FROM practices WHERE kind = 'practice' AND team_id IS ?", [teamId]).map(
      (r) => r.practice_date
    )
  );

  let d = new Date();
  let createdCount = 0;
  const horizon = weeks * 7 + 7;
  const insert = `INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address, team_id)
                   VALUES ('practice', 'Entraînement', ?, '20:00', '22:00', ?, ?, ?)`;

  for (let i = 0; i < horizon; i++) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day === 1 || day === 4) {
      const iso = d.toISOString().slice(0, 10);
      if (!existing.has(iso)) {
        const { lastInsertRowid } = run(insert, [
          iso,
          location_name || null,
          location_address || null,
          teamId,
        ]);
        applyAbsencesToPractice(lastInsertRowid);
        createdCount++;
      }
    }
  }

  return NextResponse.json({ ok: true, created: createdCount });
}
