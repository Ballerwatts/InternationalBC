import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { isAuthenticated } from "@/lib/auth";
import { stripPrivatePlayerFields } from "@/lib/player-privacy";

export const dynamic = "force-dynamic";

// Public (a player's profile page is public), but contact details, licence
// number, date of birth and the payment history are for logged-in members
// only — same rule as the roster list in ../route.js.
export async function GET(request, { params }) {
  const player = get("SELECT * FROM players WHERE id = ?", [params.id]);
  if (!player) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const canSeeContact = await isAuthenticated();
  const payments = canSeeContact
    ? query("SELECT * FROM payments WHERE player_id = ? ORDER BY paid_on DESC, id DESC", [params.id])
    : [];

  return NextResponse.json({ ...stripPrivatePlayerFields(player, canSeeContact), payments });
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
  "team_id",
  "bio",
  "nationality",
  "birth_date",
  "custom_due_amount",
];

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("organisation");
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const sets = [];
  const values = [];
  for (const f of FIELDS) {
    if (f in body) {
      sets.push(`${f} = ?`);
      if (f === "active") {
        values.push(body[f] ? 1 : 0);
      } else if (f === "custom_due_amount") {
        values.push(body[f] === "" || body[f] === null || body[f] === undefined ? null : Number(body[f]));
      } else {
        values.push(body[f]);
      }
    }
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  sets.push("updated_at = datetime('now')");
  values.push(params.id);

  run(`UPDATE players SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("organisation");
  if (unauthorized) return unauthorized;

  run("DELETE FROM players WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
