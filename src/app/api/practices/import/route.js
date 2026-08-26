import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { applyAbsencesToPractice } from "@/lib/absences";
import { requireStaff } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import { parseGameCsv } from "@/lib/game-csv";

export const dynamic = "force-dynamic";

// Bulk calendar import — games, practices, club events and tournaments.
// Called twice by the admin UI: once with dry_run to build the preview
// table, then once without to write. Nothing is inserted unless the caller
// explicitly asks, and rows duplicating an existing entry (same team, same
// date, same start time, same opponent/title) are reported and skipped.

/** 'IBBC men 2LCM' matches 'IBBC Men (2LCM)' — punctuation and case are noise. */
function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function titleFor(row) {
  if (row.kind === "game" || row.kind === "friendly") {
    const suffix =
      row.home_away === "home" ? " (domicile)" : row.home_away === "away" ? " (extérieur)" : "";
    return `${row.kind === "friendly" ? "Friendly" : "Game"} vs ${row.opponent}${suffix}`;
  }
  if (row.kind === "practice") return row.title || "Entraînement";
  return row.title || row.opponent || "Événement";
}

export async function POST(request) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const body = await request.json();
  const { csv, dry_run = true } = body;

  const teams = query("SELECT id, name FROM teams ORDER BY sort_order ASC, name ASC");
  const teamByName = new Map(teams.map((t) => [normalizeTeamName(t.name), t.id]));

  // Which calendars this import writes to. A coach is pinned to their own
  // squad whatever they send. For an admin, an empty/absent selection means
  // every squad — "select all" is the default, not an error.
  const selectedTeamIds =
    session.role === "admin"
      ? Array.isArray(body.team_ids) && body.team_ids.length > 0
        ? body.team_ids.map((v) => (v === "" || v == null ? null : Number(v)))
        : teams.map((t) => t.id)
      : [session.team_id ?? null];

  const { rows, errors, usedHeader } = parseGameCsv(csv, { defaultKind: body.default_kind });

  // Every entry already on the calendar for the squads in scope.
  const existing = query(
    "SELECT team_id, practice_date, start_time, opponent, title FROM practices"
  );
  const keyOf = (teamId, date, time, label) =>
    `${teamId ?? "club"}|${date}|${time}|${String(label || "").toLowerCase()}`;
  const existingKeys = new Set(
    existing.map((e) => keyOf(e.team_id, e.practice_date, e.start_time, e.opponent || e.title))
  );

  // Expand each parsed line into one entry per target calendar. A line naming
  // a squad goes only there; a line without one goes to every ticked squad,
  // which is how a club event or a tournament lands on all of them at once.
  const seen = new Set();
  const toCreate = [];
  const duplicates = [];
  const unknownTeams = [];

  for (const r of rows) {
    let targets;
    if (r.team) {
      const id = teamByName.get(normalizeTeamName(r.team));
      if (id == null) {
        unknownTeams.push({ line: r.line, message: `équipe inconnue : « ${r.team} »` });
        continue;
      }
      targets = [id];
    } else {
      targets = selectedTeamIds;
    }

    for (const teamId of targets) {
      const label = r.opponent || r.title;
      const key = keyOf(teamId, r.practice_date, r.start_time, label);
      const teamName = teams.find((t) => t.id === teamId)?.name ?? "Tout le club";
      if (existingKeys.has(key) || seen.has(key)) {
        duplicates.push({ ...r, team_id: teamId, team_name: teamName });
        continue;
      }
      seen.add(key);
      toCreate.push({ ...r, team_id: teamId, team_name: teamName, title: titleFor(r) });
    }
  }

  const allErrors = [...errors, ...unknownTeams].sort((a, b) => a.line - b.line);

  if (dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      usedHeader,
      errors: allErrors,
      duplicates,
      toCreate,
      teams,
    });
  }

  const insert = `INSERT INTO practices
    (kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes, team_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  let created = 0;
  for (const r of toCreate) {
    const { lastInsertRowid } = run(insert, [
      r.kind,
      r.title,
      r.practice_date,
      r.start_time,
      r.end_time,
      r.location_name,
      r.location_address,
      r.opponent,
      r.notes,
      r.team_id,
    ]);
    // Fixtures usually land months ahead, so this is the case that matters
    // most: players who already declared a trip stay marked absent.
    applyAbsencesToPractice(lastInsertRowid);
    created++;
  }

  return NextResponse.json({
    ok: true,
    created,
    skippedDuplicates: duplicates.length,
    errors: allErrors,
  });
}
