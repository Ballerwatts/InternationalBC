import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  run("DELETE FROM hero_photos WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
