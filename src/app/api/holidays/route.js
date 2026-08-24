import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

// Public read: the calendar shows "Vacances d'automne — 19 au 23 octobre"
// bands so visitors understand the gaps in the schedule.
export async function GET() {
  return NextResponse.json(
    query("SELECT * FROM holidays ORDER BY start_date ASC")
  );
}

export async function POST(request) {
  const unauthorized = await requireArea("organisation");
  if (unauthorized) return unauthorized;

  const { name, start_date, end_date, kind } = await request.json();
  if (!name || !start_date) {
    return NextResponse.json({ error: "nom et date de début requis" }, { status: 400 });
  }
  const end = end_date || start_date;
  if (end < start_date) {
    return NextResponse.json(
      { error: "la date de fin doit suivre la date de début" },
      { status: 400 }
    );
  }

  const { lastInsertRowid } = run(
    "INSERT INTO holidays (name, start_date, end_date, kind) VALUES (?, ?, ?, ?)",
    [name.trim(), start_date, end, kind === "ferie" ? "ferie" : "vacances"]
  );
  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
