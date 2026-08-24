import { run, get } from "@/lib/db";
import { verifyUnsubscribeToken, unsubscribeToken } from "@/lib/unsubscribe";
import { escapeHtml } from "@/lib/email-template";

export const dynamic = "force-dynamic";

// Public on purpose — a one-click unsubscribe that needs a login is not an
// unsubscribe. The HMAC in the link is what stops someone unsubscribing an
// address they do not hold, and there is no id to enumerate.
export async function GET(request) {
  const url = new URL(request.url);
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  const token = url.searchParams.get("token") || "";
  const action = url.searchParams.get("action") || "unsubscribe";

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return page({
      title: "This link is not valid",
      body: "<p>That unsubscribe link is incomplete or has been altered. Use the link at the bottom of the most recent newsletter, or reply to it and we will take you off the list by hand.</p>",
      status: 400,
    });
  }

  if (action === "resubscribe") {
    run("DELETE FROM email_optouts WHERE email = ?", [email]);
    return page({
      title: "You're back on the list",
      body: `<p><strong>${escapeHtml(email)}</strong> will receive the club newsletter again.</p>`,
    });
  }

  run(
    `INSERT INTO email_optouts (email, token, reason) VALUES (?, ?, 'one-click')
     ON CONFLICT(email) DO NOTHING`,
    [email, unsubscribeToken(email)]
  );

  const back = `?email=${encodeURIComponent(email)}&token=${unsubscribeToken(email)}&action=resubscribe`;
  return page({
    title: "You've been unsubscribed",
    body: `<p><strong>${escapeHtml(email)}</strong> will no longer receive the club newsletter.</p>
           <p style="color:#6b6f8d;font-size:14px;">Practical messages — practice reminders, your account — still come through. Those are not marketing.</p>
           <p><a class="btn" href="${escapeHtml(back)}">Actually, put me back on</a></p>`,
  });
}

function page({ title, body, status = 200 }) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} — International Basketball Club Genève</title>
<style>
  body { margin:0; background:#f4f5fa; font-family: system-ui, -apple-system, Segoe UI, Arial, sans-serif; color:#14173f; }
  .card { max-width:520px; margin:12vh auto; background:#fff; border-radius:14px; padding:36px 32px; box-shadow:0 10px 40px rgba(20,23,63,.08); }
  h1 { margin:0 0 14px; font-size:22px; color:#2d3194; }
  p { line-height:1.6; margin:0 0 12px; }
  .btn { display:inline-block; margin-top:8px; padding:10px 20px; border-radius:999px; background:#2d3194; color:#fff; text-decoration:none; font-weight:700; font-size:14px; }
  .foot { margin-top:22px; font-size:13px; color:#6b6f8d; }
</style></head>
<body><div class="card">
  <h1>${escapeHtml(title)}</h1>
  ${body}
  <p class="foot">International Basketball Club Genève · École Raymond Uldry, Grand-Lancy</p>
</div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
