import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { isSupportedVideoUrl } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(query("SELECT * FROM announcements ORDER BY created_at DESC"));
}

export async function POST(request) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const {
    title, body, published = 1, in_newsletter = 1,
    image_data_url = null, video_url = null, images = [],
  } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title et body sont requis" }, { status: 400 });
  }
  if (!isSupportedVideoUrl(video_url)) {
    return NextResponse.json(
      { error: "Lien vidéo non reconnu — collez une URL YouTube ou Vimeo." },
      { status: 400 }
    );
  }

  const { lastInsertRowid } = run(
    "INSERT INTO announcements (title, body, published, in_newsletter, image_data_url, video_url, images_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title, body, published ? 1 : 0, in_newsletter ? 1 : 0, image_data_url || null, (video_url || "").trim() || null, JSON.stringify(Array.isArray(images) ? images.filter(Boolean) : [])]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
