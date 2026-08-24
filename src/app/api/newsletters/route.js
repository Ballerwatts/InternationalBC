import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { requireArea, getAccount } from "@/lib/access";
import { serializeAudience } from "@/lib/newsletter-audience";
import { mondayOf, defaultSubject } from "@/lib/newsletter-build";
import { get, getAllSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  // Recipient counts come from the frozen list, not a re-resolve: the list
  // is what was actually mailed.
  return NextResponse.json(
    query(
      `SELECT n.*, t.name AS team_name,
              (SELECT COUNT(*) FROM newsletter_recipients r WHERE r.newsletter_id = n.id AND r.status = 'sent') AS sent_count,
              (SELECT COUNT(*) FROM newsletter_recipients r WHERE r.newsletter_id = n.id AND r.status = 'failed') AS failed_count,
              (SELECT COUNT(*) FROM newsletter_recipients r WHERE r.newsletter_id = n.id) AS recipient_count
       FROM newsletters n
       LEFT JOIN teams t ON t.id = n.team_id
       ORDER BY n.created_at DESC`
    )
  );
}

export async function POST(request) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const account = await getAccount();
  const body = await request.json().catch(() => ({}));
  const teamId = body.team_id ? Number(body.team_id) : null;
  const weekStart = body.week_start_date || mondayOf();
  const team = teamId ? get("SELECT * FROM teams WHERE id = ?", [teamId]) : null;

  const subject =
    body.subject || defaultSubject({ team, weekStart, settings: getAllSettings() });

  const { lastInsertRowid } = run(
    `INSERT INTO newsletters (subject, preheader, team_id, audience, blocks_json, week_start_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      subject,
      body.preheader || null,
      teamId,
      serializeAudience(body.audience || "players,users") || "players,users",
      JSON.stringify(body.blocks || []),
      weekStart,
      account?.id ?? null,
    ]
  );

  return NextResponse.json(get("SELECT * FROM newsletters WHERE id = ?", [lastInsertRowid]), { status: 201 });
}
