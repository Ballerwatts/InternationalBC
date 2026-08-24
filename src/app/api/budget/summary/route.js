import { NextResponse } from "next/server";
import { requireArea } from "@/lib/access";
import { getAllPlayerDues } from "@/lib/dues";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireArea("finance");
  if (unauthorized) return unauthorized;

  const { split, rows } = getAllPlayerDues();

  // Licence-only tallies (the green/red toggle in the dues table).
  const licenseTotals = rows.reduce(
    (acc, p) => {
      const amount = p.paid.license || 0;
      if (p.licensePaid) {
        acc.paidCount += 1;
        acc.paidAmount += amount;
      } else {
        acc.unpaidCount += 1;
        acc.unpaidAmount += split.license;
      }
      return acc;
    },
    { paidCount: 0, paidAmount: 0, unpaidCount: 0, unpaidAmount: 0 }
  );

  // Whole-of-club dues position: what has come in, what is still owed, and
  // how many players are behind. `outstanding` only counts positive
  // balances so an overpayment by one player can't mask another's debt.
  const clubTotals = rows.reduce(
    (acc, p) => {
      acc.expected += p.totalDue;
      acc.collected += p.totalPaid;
      if (p.balance > 0) {
        acc.outstanding += p.balance;
        acc.unpaidPlayers += 1;
      } else {
        acc.settledPlayers += 1;
      }
      return acc;
    },
    { expected: 0, collected: 0, outstanding: 0, unpaidPlayers: 0, settledPlayers: 0 }
  );

  return NextResponse.json({
    due: { gym: split.gym, license: split.license, referee: split.referee },
    totalDue: split.defaultTotal,
    players: rows,
    licenseTotals,
    clubTotals,
  });
}
