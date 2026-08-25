import { NextResponse } from "next/server";
import { query, get, run, getAllSettings } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildBlocks, blocksAreEmpty, mondayOf, defaultSubject } from "@/lib/newsletter-build";
import { isYouthTeam } from "@/lib/newsletter-audience";
import { siteUrl } from "@/lib/newsletter-send";

export const dynamic = "force-dynamic";

// Monday morning (Europe/Zurich), same CRON_SECRET and same POST-only shape
// as the weekly reminder. See README "Monday reminder automation".
//
// This never sends the newsletter. A club newsletter that mails itself is
// one bad fixture import away from telling 60 people the wrong score — the
// job builds the draft and taps an admin on the shoulder.
// No GET on purpose — a crawler, a link prefetch or someone pasting the URL
// into a browser must not be able to send the week's mail. POST only.
export async function POST(request) {
  return handle(request);
}

async function handle(request) {
  // Fail closed. An unset CRON_SECRET used to mean "no check at all", which
  // made this a public button that mails the whole club — and the mistake was
  // invisible, because the endpoint kept answering 200.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  {
    const auth = request.headers.get("authorization");
    const provided = auth?.replace("Bearer ", "") || new URL(request.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const weekStart = mondayOf();
  const settings = getAllSettings();
  const teams = query("SELECT * FROM teams ORDER BY sort_order ASC, id ASC");

  const created = [];
  const skipped = [];

  for (const team of teams) {
    // Idempotent on (week, squad): a scheduler that fires twice, or a
    // manual poke to check it works, must not produce two drafts.
    const existing = get("SELECT id FROM newsletters WHERE week_start_date = ? AND team_id = ?", [
      weekStart,
      team.id,
    ]);
    if (existing) {
      skipped.push({ team: team.name, reason: "draft_exists", newsletter_id: existing.id });
      continue;
    }

    const blocks = buildBlocks({ teamId: team.id, weekStart });
    if (blocksAreEmpty(blocks)) {
      skipped.push({ team: team.name, reason: "no_content" });
      continue;
    }

    const audience = isYouthTeam(team) ? "players,users,guardians" : "players,users";
    const { lastInsertRowid } = run(
      `INSERT INTO newsletters (subject, preheader, team_id, audience, blocks_json, status, week_start_date)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
      [
        defaultSubject({ team, weekStart, settings }),
        `This week with ${team.name}`,
        team.id,
        audience,
        JSON.stringify(blocks),
        weekStart,
      ]
    );
    created.push({ team: team.name, newsletter_id: lastInsertRowid, audience });
  }

  const notified = created.length ? await notifyEditors(created, weekStart) : 0;

  return NextResponse.json({ ok: true, week_start_date: weekStart, created, skipped, notified });
}

/** Super-admins and anyone holding the marketing area. */
async function notifyEditors(created, weekStart) {
  const editors = query(
    `SELECT DISTINCT email, name FROM users
     WHERE active = 1 AND email IS NOT NULL AND email != ''
       AND (role = 'admin' OR admin_areas LIKE '%marketing%')`
  );
  if (!editors.length) return 0;

  const site = siteUrl();
  const list = created
    .map((c) => `<li><a href="${site}/admin/newsletter/${c.newsletter_id}">${c.team}</a></li>`)
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#14173f;">
    <h2 style="color:#2d3194;">Your newsletter drafts are ready</h2>
    <p>Drafts for the week of ${weekStart} have been built from this week's results, fixtures and news:</p>
    <ul>${list}</ul>
    <p>Nothing has been sent. Open a draft, edit it, preview it, then send.</p>
  </div>`;
  const text = [
    "Your newsletter drafts are ready",
    `Week of ${weekStart}:`,
    ...created.map((c) => `- ${c.team}: ${site}/admin/newsletter/${c.newsletter_id}`),
    "Nothing has been sent yet.",
  ].join("\n");

  let sent = 0;
  for (const editor of editors) {
    try {
      await sendEmail({
        to: editor.email,
        subject: `IBBC — ${created.length} newsletter draft${created.length > 1 ? "s" : ""} ready`,
        html,
        text,
        category: "other",
      });
      sent++;
    } catch (e) {
      console.error("[cron:weekly-newsletter] notify failed:", editor.email, e?.message || e);
    }
  }
  return sent;
}
