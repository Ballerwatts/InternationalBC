import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { requireArea } from "@/lib/access";
import { resolveRecipients, describeCounts } from "@/lib/newsletter-audience";

export const dynamic = "force-dynamic";

// The live count behind the audience picker. Query params override the
// saved issue so the number moves as the admin ticks boxes, before saving.
export async function GET(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const newsletter = get("SELECT * FROM newsletters WHERE id = ?", [params.id]);
  if (!newsletter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(request.url);
  const teamParam = url.searchParams.get("team_id");
  const audienceParam = url.searchParams.get("audience");

  const teamId = teamParam === null ? newsletter.team_id : teamParam === "" ? null : Number(teamParam);
  const audience = audienceParam === null ? newsletter.audience : audienceParam;

  const { counts, total, skipped } = resolveRecipients({ teamId, audience });

  // Addresses themselves stay out of this payload — the compose screen only
  // needs the shape of the audience, and this is the most-polled route here.
  return NextResponse.json({
    total,
    counts,
    summary: describeCounts(counts, total),
    skipped: skipped.length,
    skipped_reasons: skipped.reduce((acc, s) => {
      acc[s.reason] = (acc[s.reason] || 0) + 1;
      return acc;
    }, {}),
  });
}
