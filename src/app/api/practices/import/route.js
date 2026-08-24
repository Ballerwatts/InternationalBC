import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { applyAbsencesToPractice } from "@/lib/absences";
import { requireStaff } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import { parseGameCsv } from "@/lib/game-csv";

export const dynamic = "force-dynamic";

// Bulk game import. Called twice by the admin UI: once with dry_run to
// build the preview table, then once without to actually write the rows.
// Nothing is inserted unless the caller explicitly asks for it, and rows
// that duplicate an existing game (same team, same date, same opponent)
// are reported and skipped rather than creating a second entry.
export async function POST(request) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  const body = await request.json();
  const { csv, dry_run = true } = body;

  // Coaches import into their own squad only; admins choose.
  const teamId =
    session.role === "admin"
      ? body.team_id === "" || body.team_id == null
        ? null
        : Number(body.team_id)
      : session.team_id ?? null;

  const { rows, errors, usedHeader } = parseGameCsv(csv);

  const existing = query(
    "SELECT practice_date, opponent FROM practices WHERE kind = 'game' AND team_id IS ?",
    [teamId]
  );
  const existingKeys = new Set(
    existing.map((e) => `${e.practice_date}|${(e.opponent || "").toLowerCase()}`)
  );

  // Duplicates within the pasted block itself count too, so a doubled line
  // doesn't slip through just because neither copy is in the database yet.
  const seen = new Set();
  const toCreate = [];
  const duplicates = [];
  for (const r of rows) {
    const key = `${r.practice_date}|${r.opponent.toLowerCase()}`;
    if (existingKeys.has(key) || seen.has(key)) {
      duplicates.push(r);
      continue;
    }
    seen.add(key);
    toCreate.push(r);
  }

  if (dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      usedHeader,
      errors,
      duplicates,
      toCreate,
    });
  }

  const insert = `INSERT INTO practices
    (kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes, team_id)
    VALUES ('game', ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  let created = 0;
  for (const r of toCreate) {
    // home_away only decorates the title — the schema has no column for it,
    // and the venue already carries the real information.
    const suffix = r.home_away === "home" ? " (domicile)" : r.home_away === "away" ? " (extérieur)" : "";
    const { lastInsertRowid } = run(insert, [
      `Match vs ${r.opponent}${suffix}`,
      r.practice_date,
      r.start_time,
      r.end_time,
      r.location_name,
      r.location_address,
      r.opponent,
      r.notes,
      teamId,
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
    errors,
  });
}
