import { NextResponse } from "next/server";
import { query, getAllSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const settings = getAllSettings();
  const players = query(
    "SELECT id, first_name, last_name, jersey_number, active FROM players ORDER BY sort_order ASC, last_name ASC"
  );
  const paidRows = query(
    `SELECT player_id, category, SUM(amount) as total FROM payments WHERE season = ? GROUP BY player_id, category`,
    ["2026-2027"]
  );

  const paidByPlayer = {};
  for (const row of paidRows) {
    paidByPlayer[row.player_id] = paidByPlayer[row.player_id] || {};
    paidByPlayer[row.player_id][row.category] = row.total;
  }

  const due = {
    gym: Number(settings.budget_gym) || 0,
    license: Number(settings.budget_license) || 0,
    referee: Number(settings.budget_referee) || 0,
  };
  const totalDue = due.gym + due.license + due.referee;

  const rows = players.map((p) => {
    const paid = paidByPlayer[p.id] || {};
    const totalPaid = (paid.gym || 0) + (paid.license || 0) + (paid.referee || 0) + (paid.other || 0);
    return {
      ...p,
      paid,
      totalPaid,
      totalDue,
      balance: totalDue - totalPaid,
    };
  });

  return NextResponse.json({ due, totalDue, players: rows });
}
