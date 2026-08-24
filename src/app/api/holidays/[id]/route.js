import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("organisation");
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const sets = [];
  const values = [];
  for (const f of ["name", "start_date", "end_date", "kind"]) {
    if (f in body) {
      sets.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  values.push(params.id);
  run(`UPDATE holidays SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("organisation");
  if (unauthorized) return unauthorized;

  run("DELETE FROM holidays WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
