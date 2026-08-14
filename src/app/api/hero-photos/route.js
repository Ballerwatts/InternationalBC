import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const MAX_HERO_PHOTOS = 3;

// Shown publicly in the homepage hero slider — GET is open to everyone.
export async function GET() {
  return NextResponse.json(query("SELECT * FROM hero_photos ORDER BY sort_order ASC, id ASC"));
}

export async function POST(request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { image_data_url } = await request.json();
  if (!image_data_url) {
    return NextResponse.json({ error: "image_data_url est requis" }, { status: 400 });
  }

  const count = query("SELECT COUNT(*) as c FROM hero_photos")[0].c;
  if (count >= MAX_HERO_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_HERO_PHOTOS} photos` }, { status: 400 });
  }

  const maxOrder = query("SELECT COALESCE(MAX(sort_order), -1) as m FROM hero_photos")[0].m;

  const { lastInsertRowid } = run(
    "INSERT INTO hero_photos (image_data_url, sort_order) VALUES (?, ?)",
    [image_data_url, maxOrder + 1]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
