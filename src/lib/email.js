// Minimal email sender. Prefers Resend (https://resend.com) via plain fetch
// (no extra dependency). Falls back to logging in development so the whole
// app still runs with zero email provider configured.
//
// Required env vars in production: RESEND_API_KEY, FROM_EMAIL

export async function sendEmail({ to, subject, html, text, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "International Basketball Club Genève <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("[email:dev-mode] Would send email:", { to, subject });
    return { ok: true, dev: true };
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };

  if (attachments && attachments.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content).toString("base64"),
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }

  return { ok: true };
}
