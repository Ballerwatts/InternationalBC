import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Sponsors are shown publicly on the home page — GET is open to everyone.
export async function GET() {
  return NextResponse.json(query("SELECT * FROM sponsors ORDER BY sort_order ASC, id ASC"));
}

export async function POST(request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const s = await request.json();
  if (!s.name) {
    return NextResponse.json({ error: "Le nom du sponsor est requis" }, { status: 400 });
  }

  const maxOrder = query("SELECT COALESCE(MAX(sort_order), -1) as m FROM sponsors")[0].m;

  const { lastInsertRowid } = run(
    "INSERT INTO sponsors (name, logo_data_url, description, website_url, tier, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    [
      s.name,
      s.logo_data_url || null,
      s.description || null,
      s.website_url || null,
      s.tier === "main" ? "main" : "standard",
      maxOrder + 1,
    ]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
