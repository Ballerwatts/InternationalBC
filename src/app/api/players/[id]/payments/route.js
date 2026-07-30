import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(
    query("SELECT * FROM payments WHERE player_id = ? ORDER BY paid_on DESC, id DESC", [params.id])
  );
}
