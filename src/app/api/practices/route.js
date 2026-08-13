import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  if (from) {
    return NextResponse.json(
      query(
        "SELECT * FROM practices WHERE practice_date >= ? ORDER BY practice_date ASC, start_time ASC",
        [from]
      )
    );
  }
  return NextResponse.json(
    query("SELECT * FROM practices ORDER BY practice_date ASC, start_time ASC")
  );
}

export async function POST(request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json();

  if (body.action === "generate_weeks") {
    return generateWeeks(body);
  }

  const { kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes } = body;
  if (!practice_date || !start_time || !end_time) {
    return NextResponse.json({ error: "date, heure de début et de fin requises" }, { status: 400 });
  }

  const { lastInsertRowid } = run(
    `INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address, opponent, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}

function generateWeeks({ weeks = 12, location_name, location_address }) {
  const existing = new Set(
    query("SELECT practice_date FROM practices WHERE kind = 'practice'").map((r) => r.practice_date)
  );

  let d = new Date();
  let createdCount = 0;
  const horizon = weeks * 7 + 7;
  const insert = `INSERT INTO practices (kind, title, practice_date, start_time, end_time, location_name, location_address)
                   VALUES ('practice', 'Entraînement', ?, '20:00', '22:00', ?, ?)`;

  for (let i = 0; i < horizon; i++) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day === 1 || day === 4) {
      const iso = d.toISOString().slice(0, 10);
      if (!existing.has(iso)) {
        run(insert, [iso, location_name || null, location_address || null]);
        createdCount++;
      }
    }
  }

  return NextResponse.json({ ok: true, created: createdCount });
}
