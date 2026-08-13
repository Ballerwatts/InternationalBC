import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    query("SELECT * FROM practice_board ORDER BY week_start_date DESC")
  );
}

export async function POST(request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const { week_start_date, focus, drills, notes } = await request.json();
  if (!week_start_date) {
    return NextResponse.json({ error: "week_start_date requis" }, { status: 400 });
  }

  const { lastInsertRowid } = run(
    "INSERT INTO practice_board (week_start_date, focus, drills, notes) VALUES (?, ?, ?, ?)",
    [week_start_date, focus || "", drills || "", notes || ""]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
