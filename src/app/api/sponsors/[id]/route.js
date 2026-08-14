import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const FIELDS = ["name", "logo_data_url", "description", "website_url", "tier", "sort_order"];

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const sets = [];
  const values = [];
  for (const f of FIELDS) {
    if (f in body) {
      sets.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  values.push(params.id);
  run(`UPDATE sponsors SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  run("DELETE FROM sponsors WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
