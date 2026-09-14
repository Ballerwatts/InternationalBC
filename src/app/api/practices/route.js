import { NextResponse } from "next/server";
import { query, run, getSlotsForTeam, getTeamPracticeGym, toTeamId } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import { applyAbsencesToPractice } from "@/lib/absences";
import { expandHolidayDays } from "@/lib/holidays";
import { isSupportedVideoUrl } from "@/lib/video";
import { toISODate } from "@/lib/dates";

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

  // Coaches can only ever write to their own team; admins may target any
  // team. toTeamId() is what turns the "Tout le club" option's "" into NULL.
  const teamId = toTeamId(session.role === "admin" ? body.team_id : session.team_id);

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

  // A practice for a squad with no venue typed in takes the squad's own
  // hall — the gym linked to the team is the answer to "where is it?".
  const teamGym = kind === "practice" || !kind ? getTeamPracticeGym(teamId) : null;

  const { lastInsertRowid } = run(
    `INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes, video_url, team_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      kind || "practice",
      title || (kind === "game" ? "Game" : kind === "friendly" ? "Friendly" : "Entraînement"),
      practice_date,
      start_time,
      end_time,
      location_name || teamGym?.name || null,
      location_address || (location_name ? null : teamGym?.address) || null,
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

function generateWeeks({ weeks = 12, teamId }) {
  // The squad's own weekly pattern — which days, what times, which hall.
  // Falls back to the historical Monday/Thursday 20:00–22:00 only when a
  // squad has no pattern saved yet, so existing behaviour is unchanged until
  // someone sets one from /admin/schedule.
  const slots = getSlotsForTeam(teamId);
  // A slot with no hall chosen falls back to the squad's linked practice gym.
  const teamGym = getTeamPracticeGym(teamId);
  const pattern = slots.length
    ? slots
    : [
        { weekday: 1, start_time: "20:00", end_time: "22:00", gym_name: null, gym_address: null },
        { weekday: 4, start_time: "20:00", end_time: "22:00", gym_name: null, gym_address: null },
      ];

  // A session already on the calendar is identified by date AND start time —
  // a squad can legitimately train twice on the same day.
  const existing = new Set(
    query(
      "SELECT practice_date, start_time FROM practices WHERE kind = 'practice' AND team_id IS ?",
      [teamId]
    ).map((r) => `${r.practice_date}|${r.start_time}`)
  );

  const byWeekday = new Map();
  for (const slot of pattern) {
    if (!byWeekday.has(slot.weekday)) byWeekday.set(slot.weekday, []);
    byWeekday.get(slot.weekday).push(slot);
  }

  // A day the squad already plays on is not a training day — the generator
  // steps over it and says so, rather than double-booking the hall.
  const gameDays = new Set(
    query(
      "SELECT practice_date FROM practices WHERE kind IN ('game', 'friendly') AND team_id IS ?",
      [teamId]
    ).map((r) => r.practice_date)
  );

  // Geneva school holidays: the hall is a school, so a session inside one
  // may not happen. It is still created — the coach decides — but it comes
  // back flagged so the admin screen can say how many to check.
  const holidayDays = expandHolidayDays(query("SELECT * FROM holidays"));

  const insert = `INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address, team_id)
                   VALUES ('practice', 'Entraînement', ?, ?, ?, ?, ?, ?)`;

  const d = new Date();
  let createdCount = 0;
  let duringHolidays = 0;
  const skippedForGames = [];
  for (let i = 0; i < weeks * 7; i++) {
    d.setDate(d.getDate() + 1);
    const daySlots = byWeekday.get(d.getDay());
    if (!daySlots) continue;
    const iso = toISODate(d);
    if (gameDays.has(iso)) {
      skippedForGames.push(iso);
      continue;
    }
    for (const slot of daySlots) {
      if (existing.has(`${iso}|${slot.start_time}`)) continue;
      const { lastInsertRowid } = run(insert, [
        iso,
        slot.start_time,
        slot.end_time,
        slot.gym_name || teamGym?.name || null,
        slot.gym_address || (slot.gym_name ? null : teamGym?.address) || null,
        teamId,
      ]);
      applyAbsencesToPractice(lastInsertRowid);
      existing.add(`${iso}|${slot.start_time}`);
      createdCount++;
      if (holidayDays[iso]) duringHolidays++;
    }
  }

  return NextResponse.json({
    ok: true,
    created: createdCount,
    duringHolidays,
    skippedForGames,
    usedPattern: slots.length > 0,
  });
}
