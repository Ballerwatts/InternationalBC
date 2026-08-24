import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const unauthorized = await requireArea("finance");
  if (unauthorized) return unauthorized;

  const { player_id, season, category, amount, paid_on, note } = await request.json();
  if (!player_id || !category || !amount) {
    return NextResponse.json({ error: "player_id, category et amount sont requis" }, { status: 400 });
  }

  const { lastInsertRowid } = run(
    `INSERT INTO payments (player_id, season, category, amount, paid_on, note) VALUES (?, ?, ?, ?, ?, ?)`,
    [player_id, season || "2026-2027", category, amount, paid_on || null, note || null]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
