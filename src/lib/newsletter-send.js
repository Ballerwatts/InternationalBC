// Sending an issue: freeze the list, then work through it.
//
// The order matters. Recipients are written to newsletter_recipients
// *before* the first message goes out, so a crash halfway through leaves a
// record of exactly who was already mailed. Re-running the send only picks
// up rows still 'queued' or 'failed' — which is why "Retry failed" and
// "Send" are the same operation and nobody gets two copies.

import { query, get, run, getAllSettings, getHomeGym } from "@/lib/db";
import { sendBatch } from "@/lib/email";
import { renderNewsletter } from "@/lib/email-template";
import { resolveRecipients } from "@/lib/newsletter-audience";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { publishNewsletterPost } from "@/lib/newsletter-post";

export function siteUrl() {
  return String(process.env.SITE_URL || "https://internationalbc.fly.dev").replace(/\/+$/, "");
}

export function parseBlocks(newsletter) {
  let blocks;
  try {
    blocks = JSON.parse(newsletter?.blocks_json || "[]");
  } catch {
    blocks = [];
  }
  if (!Array.isArray(blocks)) blocks = [];

  // Sponsors are part of the deal, not an editorial choice: once the club
  // has sponsors they belong in every issue. If an issue was drafted before
  // a sponsor existed, or the block was removed, it is put back at send time
  // rather than quietly costing the club a placement it sold.
  if (!blocks.some((b) => b?.type === "sponsors")) {
    const sponsors = query("SELECT * FROM sponsors ORDER BY sort_order ASC, id ASC").map((s) => ({
      id: s.id,
      name: s.name,
      website_url: s.website_url,
      // A data: URI cannot render in Gmail, so only real URLs travel.
      logo_url: /^https?:\/\//i.test(String(s.logo_data_url || "")) ? s.logo_data_url : null,
    }));
    if (sponsors.length) blocks = [...blocks, { type: "sponsors", sponsors }];
  }

  return blocks;
}

/** club + team context every render needs, read once per send. */
export function renderContext(newsletter) {
  const settings = getAllSettings();
  const homeGym = getHomeGym();
  const team = newsletter.team_id ? get("SELECT * FROM teams WHERE id = ?", [newsletter.team_id]) : null;
  return {
    club: {
      name: settings.club_name || "International Basketball Club Genève",
      // The club's main hall, from the gyms table. The old hardcoded string
      // named the wrong commune and never changed when a venue did.
      gym: homeGym
        ? [homeGym.name, homeGym.address].filter(Boolean).join(", ")
        : settings.practice_location_name || "",
      crest_url: "/logo.png",
    },
    team,
    headerText: settings.newsletter_header_text || "",
    footerText: settings.newsletter_footer_text || "",
    siteUrl: siteUrl(),
  };
}

/** One issue as one person will see it. Used by preview, test send and send. */
export function renderFor(newsletter, recipient) {
  const ctx = renderContext(newsletter);
  return renderNewsletter({
    ...ctx,
    blocks: parseBlocks(newsletter),
    subject: newsletter.subject,
    preheader: newsletter.preheader || "",
    recipientName: recipient?.name || "",
    unsubscribeUrl: recipient?.email ? unsubscribeUrl(recipient.email, ctx.siteUrl) : "",
  });
}

/**
 * Write the audience into newsletter_recipients. Idempotent: re-freezing an
 * issue that is mid-send leaves the rows already marked 'sent' alone.
 */
export function freezeRecipients(newsletter) {
  const { recipients, skipped, counts, total } = resolveRecipients({
    teamId: newsletter.team_id,
    audience: newsletter.audience,
  });

  for (const r of recipients) {
    run(
      `INSERT INTO newsletter_recipients (newsletter_id, email, name, source, player_id, user_id, team_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')
       ON CONFLICT(newsletter_id, email) DO NOTHING`,
      [newsletter.id, r.email, r.name || null, r.source, r.player_id, r.user_id, r.team_id]
    );
  }

  // Opt-outs and bad addresses are recorded rather than dropped: "45 people
  // are in this squad, 42 were mailed" needs the other 3 to be explainable.
  for (const s of skipped) {
    if (!s.email) continue;
    run(
      `INSERT INTO newsletter_recipients (newsletter_id, email, name, source, player_id, user_id, team_id, status, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'skipped', ?)
       ON CONFLICT(newsletter_id, email) DO NOTHING`,
      [newsletter.id, s.email, s.name || null, s.source, s.player_id, s.user_id, s.team_id, s.reason]
    );
  }

  return { counts, total, skipped: skipped.length };
}

/**
 * Send (or resume) an issue.
 * @returns {Promise<{sent:number, failed:number, skipped:number, status:string}>}
 */
export async function sendNewsletter(newsletterId) {
  const newsletter = get("SELECT * FROM newsletters WHERE id = ?", [newsletterId]);
  if (!newsletter) throw new Error("newsletter not found");

  freezeRecipients(newsletter);
  run("UPDATE newsletters SET status = 'sending', updated_at = datetime('now') WHERE id = ?", [newsletterId]);

  const pending = query(
    "SELECT * FROM newsletter_recipients WHERE newsletter_id = ? AND status IN ('queued','failed')",
    [newsletterId]
  );

  const messages = pending.map((r) => {
    const { html, text } = renderFor(newsletter, r);
    return {
      ref: r.id,
      to: r.email,
      subject: newsletter.subject,
      html,
      text,
      category: "newsletter",
      newsletterId: newsletter.id,
    };
  });

  const results = await sendBatch(messages, {
    concurrency: 5,
    delayMs: 200,
    onResult: (result) => {
      run(
        `UPDATE newsletter_recipients
         SET status = ?, error = ?, sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END
         WHERE id = ?`,
        [result.ok ? "sent" : "failed", result.ok ? null : String(result.error || "").slice(0, 500), result.ok ? "sent" : "failed", result.ref]
      );
    },
  });

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  const skipped = query(
    "SELECT COUNT(*) AS n FROM newsletter_recipients WHERE newsletter_id = ? AND status = 'skipped'",
    [newsletterId]
  )[0].n;

  // 'failed' only when nobody at all got it — a single bad address must not
  // make an otherwise delivered issue look undelivered.
  const status = sent > 0 ? "sent" : results.length === 0 ? newsletter.status : "failed";
  run(
    `UPDATE newsletters
     SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END, updated_at = datetime('now')
     WHERE id = ?`,
    [status, status, newsletterId]
  );

  // Mirror it onto the home page once it has actually gone out, not before —
  // a draft that never sends should not appear as club news.
  let post = { posted: false, reason: "not_sent" };
  if (status === "sent") post = publishNewsletterPost(newsletterId);

  return { sent, failed, skipped, status, attempted: results.length, post };
}
