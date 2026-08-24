import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

// The club-level income/expense ledger ("in's and out's"). Admin-only —
// distinct from the per-player dues tracked in /api/payments.
export async function GET() {
  const unauthorized = await requireArea("finance");
  if (unauthorized) return unauthorized;

  return NextResponse.json(query("SELECT * FROM budget_entries ORDER BY entry_date DESC, id DESC"));
}

export async function POST(request) {
  const unauthorized = await requireArea("finance");
  if (unauthorized) return unauthorized;

  const e = await request.json();
  if (!e.entry_type || !["income", "expense"].includes(e.entry_type)) {
    return NextResponse.json({ error: "entry_type doit être 'income' ou 'expense'" }, { status: 400 });
  }
  if (!e.category || !e.amount || !e.entry_date) {
    return NextResponse.json({ error: "category, amount et entry_date sont requis" }, { status: 400 });
  }

  const { lastInsertRowid } = run(
    "INSERT INTO budget_entries (entry_type, category, description, amount, entry_date) VALUES (?, ?, ?, ?, ?)",
    [e.entry_type, e.category, e.description || null, Number(e.amount), e.entry_date]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
