import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { buildBlocks, mondayOf } from "@/lib/newsletter-build";

export const dynamic = "force-dynamic";

// Fill the issue from this week's data. Deliberately destructive of the
// generated blocks but not of the admin's intro: regenerating after adding
// a score should not wipe the paragraph they wrote.
export async function POST(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const newsletter = get("SELECT * FROM newsletters WHERE id = ?", [params.id]);
  if (!newsletter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const weekStart = newsletter.week_start_date || mondayOf();
  const blocks = buildBlocks({ teamId: newsletter.team_id, weekStart });

  let existingIntro = "";
  try {
    const previous = JSON.parse(newsletter.blocks_json || "[]");
    existingIntro = previous.find((b) => b.type === "intro")?.text || "";
  } catch {
    existingIntro = "";
  }
  if (existingIntro) {
    const intro = blocks.find((b) => b.type === "intro");
    if (intro) intro.text = existingIntro;
  }

  run("UPDATE newsletters SET blocks_json = ?, updated_at = datetime('now') WHERE id = ?", [
    JSON.stringify(blocks),
    params.id,
  ]);

  return NextResponse.json({ ok: true, blocks });
}
