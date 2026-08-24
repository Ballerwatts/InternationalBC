import { NextResponse } from "next/server";
import { query, run, get } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

// Guardian contact details are personal data about someone who is not even
// a member, so they live behind the Organisation area with the rest of the
// member records and never appear in a public payload.
export async function GET(request, { params }) {
  const denied = await requireArea("organisation");
  if (denied) return denied;

  return NextResponse.json(
    query("SELECT * FROM player_guardians WHERE player_id = ? ORDER BY id ASC", [params.id])
  );
}

export async function POST(request, { params }) {
  const denied = await requireArea("organisation");
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const { lastInsertRowid } = run(
    `INSERT INTO player_guardians (player_id, name, email, phone, relation, receives_newsletter)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.id,
      body.name,
      body.email || null,
      body.phone || null,
      body.relation || null,
      body.receives_newsletter === false ? 0 : 1,
    ]
  );

  return NextResponse.json(get("SELECT * FROM player_guardians WHERE id = ?", [lastInsertRowid]), { status: 201 });
}
