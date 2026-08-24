import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

const FIELDS = ["entry_type", "category", "description", "amount", "entry_date"];

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("finance");
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const sets = [];
  const values = [];
  for (const f of FIELDS) {
    if (f in body) {
      sets.push(`${f} = ?`);
      values.push(f === "amount" ? Number(body[f]) : body[f]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  values.push(params.id);
  run(`UPDATE budget_entries SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("finance");
  if (unauthorized) return unauthorized;

  run("DELETE FROM budget_entries WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
