import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const player = get("SELECT * FROM players WHERE id = ?", [params.id]);
  if (!player) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const payments = query(
    "SELECT * FROM payments WHERE player_id = ? ORDER BY paid_on DESC, id DESC",
    [params.id]
  );

  return NextResponse.json({ ...player, payments });
}

const FIELDS = [
  "first_name",
  "last_name",
  "jersey_number",
  "license_number",
  "email",
  "phone",
  "photo_data_url",
  "position",
  "games_played",
  "total_points",
  "ppg",
  "active",
  "sort_order",
];

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const sets = [];
  const values = [];
  for (const f of FIELDS) {
    if (f in body) {
      sets.push(`${f} = ?`);
      values.push(f === "active" ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  sets.push("updated_at = datetime('now')");
  values.push(params.id);

  run(`UPDATE players SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  run("DELETE FROM players WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
