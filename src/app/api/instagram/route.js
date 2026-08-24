import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { normalizeInstagramUrl } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// The gallery is public — GET is open to everyone.
export async function GET() {
  return NextResponse.json(
    query("SELECT * FROM instagram_posts ORDER BY sort_order ASC, id DESC")
  );
}

// Writes are super-admin only (this embeds a third-party script on the
// public site, so it is not delegated with the Marketing area).
export async function POST(request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const url = normalizeInstagramUrl(body.post_url);
  if (!url) {
    return NextResponse.json(
      { error: "Lien Instagram non reconnu. Collez l'URL d'une publication ou d'un reel." },
      { status: 400 }
    );
  }

  const already = query("SELECT id FROM instagram_posts WHERE post_url = ?", [url]);
  if (already.length) {
    return NextResponse.json({ error: "Cette publication est déjà dans la galerie." }, { status: 409 });
  }

  const maxOrder = query("SELECT COALESCE(MAX(sort_order), -1) as m FROM instagram_posts")[0].m;
  const { lastInsertRowid } = run(
    "INSERT INTO instagram_posts (post_url, caption, sort_order) VALUES (?, ?, ?)",
    [url, (body.caption || "").trim() || null, maxOrder + 1]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid, post_url: url });
}
