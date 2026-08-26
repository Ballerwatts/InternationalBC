import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { publishNewsletterPost } from "@/lib/newsletter-post";
import { parseBlocks } from "@/lib/newsletter-send";

export const dynamic = "force-dynamic";

/**
 * Put this issue on the home page now — without sending it, and without
 * composing anything.
 *
 * Writing a whole newsletter to get one item of club news onto the site is
 * too much work for the common case, so this takes what the issue already
 * has (its subject, and the text of its blocks) and publishes that. Whatever
 * it produces is then a normal announcement: editable, unpublishable and
 * deletable from /admin/announcements, which owns it from that point on.
 */
export async function POST(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const issue = get("SELECT * FROM newsletters WHERE id = ?", [params.id]);
  if (!issue) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  // Seed a body from the issue's own blocks the first time, so a one-click
  // post is not an empty card. Never overwrite a comment already written.
  if (!issue.post_body) {
    const summary = parseBlocks(issue)
      .map((b) => (b?.text || b?.body || b?.title || "").trim())
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 600);
    if (summary) run("UPDATE newsletters SET post_body = ? WHERE id = ?", [summary, params.id]);
  }

  run("UPDATE newsletters SET post_enabled = 1, updated_at = datetime('now') WHERE id = ?", [
    params.id,
  ]);

  const result = publishNewsletterPost(Number(params.id));
  return NextResponse.json({ ok: true, ...result });
}

/** Take it back off the home page, leaving the issue itself untouched. */
export async function DELETE(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  run("UPDATE newsletters SET post_enabled = 0, updated_at = datetime('now') WHERE id = ?", [
    params.id,
  ]);
  const result = publishNewsletterPost(Number(params.id));
  return NextResponse.json({ ok: true, ...result });
}
