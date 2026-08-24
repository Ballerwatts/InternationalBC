import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { renderFor } from "@/lib/newsletter-send";

export const dynamic = "force-dynamic";

// Renders through the exact function the sender uses. Accepts the unsaved
// draft in the body so the preview tracks what the admin is typing.
export async function POST(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const saved = get("SELECT * FROM newsletters WHERE id = ?", [params.id]);
  if (!saved) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const newsletter = {
    ...saved,
    subject: body.subject ?? saved.subject,
    preheader: body.preheader ?? saved.preheader,
    team_id: "team_id" in body ? (body.team_id ? Number(body.team_id) : null) : saved.team_id,
    blocks_json: body.blocks ? JSON.stringify(body.blocks) : saved.blocks_json,
  };

  const { html, text } = renderFor(newsletter, { name: "Alex Dupont", email: "preview@example.com" });
  return NextResponse.json({ html, text });
}
