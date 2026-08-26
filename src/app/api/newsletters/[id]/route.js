import { NextResponse } from "next/server";
import { get, run, query } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { serializeAudience } from "@/lib/newsletter-audience";
import { isSupportedVideoUrl } from "@/lib/video";
import { publishNewsletterPost } from "@/lib/newsletter-post";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const newsletter = get("SELECT * FROM newsletters WHERE id = ?", [params.id]);
  if (!newsletter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ...newsletter,
    recipients: query(
      "SELECT id, email, name, source, status, error, sent_at FROM newsletter_recipients WHERE newsletter_id = ? ORDER BY status, email",
      [params.id]
    ),
  });
}

export async function PUT(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const newsletter = get("SELECT * FROM newsletters WHERE id = ?", [params.id]);
  if (!newsletter) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (newsletter.status === "sent") {
    // Editing an issue after it has gone out would make the log describe
    // something nobody received.
    return NextResponse.json({ error: "already_sent" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const sets = [];
  const values = [];

  const assign = (column, value) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if ("subject" in body) assign("subject", body.subject);
  if ("preheader" in body) assign("preheader", body.preheader || null);
  if ("team_id" in body) assign("team_id", body.team_id ? Number(body.team_id) : null);
  if ("audience" in body) assign("audience", serializeAudience(body.audience) || "players,users");
  if ("blocks" in body) assign("blocks_json", JSON.stringify(body.blocks || []));
  if ("status" in body && ["draft", "scheduled"].includes(body.status)) assign("status", body.status);
  if ("scheduled_for" in body) assign("scheduled_for", body.scheduled_for || null);

  // Home-page post — composed separately from the e-mail.
  if ("post_enabled" in body) assign("post_enabled", body.post_enabled ? 1 : 0);
  if ("post_title" in body) assign("post_title", (body.post_title || "").trim() || null);
  if ("post_body" in body) assign("post_body", (body.post_body || "").trim() || null);
  if ("post_image_data_url" in body) assign("post_image_data_url", body.post_image_data_url || null);
  if ("post_video_url" in body) {
    const url = (body.post_video_url || "").trim();
    if (!isSupportedVideoUrl(url)) {
      return NextResponse.json(
        { error: "Lien vidéo non reconnu — collez une URL YouTube ou Vimeo." },
        { status: 400 }
      );
    }
    assign("post_video_url", url || null);
  }

  if (!sets.length) return NextResponse.json({ ok: true, unchanged: true });

  sets.push("updated_at = datetime('now')");
  values.push(params.id);
  run(`UPDATE newsletters SET ${sets.join(", ")} WHERE id = ?`, values);

  // Editing the post of an issue that already went out should update what is
  // on the home page straight away, rather than waiting for a re-send that
  // will never come.
  const after = get("SELECT status FROM newsletters WHERE id = ?", [params.id]);
  const touchedPost = Object.keys(body).some((k) => k.startsWith("post_"));
  if (touchedPost && after?.status === "sent") publishNewsletterPost(Number(params.id));

  // The audience changing invalidates a list frozen earlier — but only the
  // part that has not gone out yet.
  if ("audience" in body || "team_id" in body) {
    run("DELETE FROM newsletter_recipients WHERE newsletter_id = ? AND status IN ('queued','skipped')", [params.id]);
  }

  return NextResponse.json(get("SELECT * FROM newsletters WHERE id = ?", [params.id]));
}

export async function DELETE(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  run("DELETE FROM newsletters WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
