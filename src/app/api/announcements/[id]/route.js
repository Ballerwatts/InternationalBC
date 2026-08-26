import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { isSupportedVideoUrl } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  const { title, body, published, in_newsletter, image_data_url, video_url } = await request.json();
  if (!isSupportedVideoUrl(video_url)) {
    return NextResponse.json(
      { error: "Lien vidéo non reconnu — collez une URL YouTube ou Vimeo." },
      { status: 400 }
    );
  }
  // Editing a post that came from a newsletter hands ownership to this
  // screen: post_detached stops the next publish from reverting the change.
  run(
    "UPDATE announcements SET title = ?, body = ?, published = ?, in_newsletter = ?, image_data_url = ?, video_url = ?, post_detached = CASE WHEN newsletter_id IS NULL THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?",
    [title, body, published ? 1 : 0, in_newsletter ? 1 : 0, image_data_url || null, (video_url || "").trim() || null, params.id]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireArea("marketing");
  if (unauthorized) return unauthorized;

  // Deleting a newsletter-born post means "off the home page", so switch the
  // issue's post off too — otherwise re-sending would resurrect what was
  // deliberately removed.
  const row = get("SELECT newsletter_id FROM announcements WHERE id = ?", [params.id]);
  run("DELETE FROM announcements WHERE id = ?", [params.id]);
  if (row?.newsletter_id) {
    run("UPDATE newsletters SET post_enabled = 0, updated_at = datetime('now') WHERE id = ?", [
      row.newsletter_id,
    ]);
  }
  return NextResponse.json({ ok: true });
}
