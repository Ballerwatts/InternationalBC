import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  const { week_start_date, focus, drills, notes } = await request.json();
  run(
    `UPDATE practice_board SET week_start_date = ?, focus = ?, drills = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [week_start_date, focus || "", drills || "", notes || "", params.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireStaff();
  if (unauthorized) return unauthorized;

  run("DELETE FROM practice_board WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
