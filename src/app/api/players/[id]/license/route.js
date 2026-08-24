import { NextResponse } from "next/server";
import { get, query, run, getAllSettings } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

const SEASON = "2026-2027";

// One-click toggle for the license paid/unpaid badge shown in the Budget
// and Members admin pages — avoids having to open a player's payment
// history just to flip this one flag.
export async function POST(request, { params }) {
  const unauthorized = await requireArea("organisation");
  if (unauthorized) return unauthorized;

  const { paid } = await request.json();
  const player = get("SELECT id FROM players WHERE id = ?", [params.id]);
  if (!player) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (paid) {
    const alreadyPaid = query(
      "SELECT id FROM payments WHERE player_id = ? AND season = ? AND category = 'license'",
      [params.id, SEASON]
    );
    if (alreadyPaid.length === 0) {
      const licenseAmount = Number(getAllSettings().budget_license) || 0;
      run(
        `INSERT INTO payments (player_id, season, category, amount, paid_on, note)
         VALUES (?, ?, 'license', ?, date('now'), 'Marked paid from admin')`,
        [params.id, SEASON, licenseAmount || 0]
      );
    }
  } else {
    run("DELETE FROM payments WHERE player_id = ? AND season = ? AND category = 'license'", [
      params.id,
      SEASON,
    ]);
  }

  return NextResponse.json({ ok: true });
}
