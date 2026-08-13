// Minimal email sender over plain SMTP (via nodemailer) — works with any
// mailbox (Gmail, your own domain, Infomaniak, etc.), not tied to a
// third-party email API. Falls back to logging in development so the whole
// app still runs with zero SMTP configured.
//
// Required env vars in production: SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS, FROM_EMAIL. See .env.example.

import nodemailer from "nodemailer";

let _transporter;

function getTransporter() {
  if (_transporter !== undefined) return _transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    _transporter = null;
    return _transporter;
  }

  _transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    // Port 465 is implicit TLS; anything else (587, 25) uses STARTTLS.
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return _transporter;
}

export async function sendEmail({ to, subject, html, text, attachments }) {
  const from =
    process.env.FROM_EMAIL || "International Basketball Club Genève <no-reply@international-bc-geneve.local>";
  const transporter = getTransporter();

  if (!transporter) {
    console.log("[email:dev-mode] Would send email:", { to, subject });
    return { ok: true, dev: true };
  }

  const mail = {
    from,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text,
  };

  if (attachments && attachments.length) {
    mail.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    }));
  }

  await transporter.sendMail(mail);
  return { ok: true };
}
