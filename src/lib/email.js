// Minimal email sender over plain SMTP (via nodemailer) — works with any
// mailbox (Gmail, your own domain, Infomaniak, etc.), not tied to a
// third-party email API. Falls back to logging in development so the whole
// app still runs with zero SMTP configured.
//
// Required env vars in production: SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS, FROM_EMAIL. See .env.example.
//
// Every send — real, failed, or dev-mode — writes one row to `email_log`.
// That table is the whole answer to "did the club actually receive it?",
// so logging must never be the reason a send fails: it is wrapped and
// swallowed on purpose.

import nodemailer from "nodemailer";
import { run } from "@/lib/db";
import { effectiveSmtp } from "@/lib/smtp-config";

let _transporter;
let _transporterKey; // the config the cached transporter was built from

/**
 * Built from whichever mailbox is live — the one saved in /admin/emails, or
 * the env vars as fallback. The cache is keyed on the config itself, so
 * saving new settings takes effect on the next send with no restart and no
 * explicit invalidation to forget.
 */
function getTransporter() {
  const { config } = effectiveSmtp();

  if (!config?.host) {
    _transporter = null;
    _transporterKey = null;
    return null;
  }

  const cacheKey = JSON.stringify([config.host, config.port, config.secure, config.user, config.pass]);
  if (_transporter && _transporterKey === cacheKey) return _transporter;

  _transporter = nodemailer.createTransport({
    host: config.host,
    // Port 465 is implicit TLS; anything else (587, 25) uses STARTTLS.
    port: config.port,
    secure: config.secure || config.port === 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });
  _transporterKey = cacheKey;

  return _transporter;
}

/** Which SMTP settings are live, and where they came from. Never the password. */
export function smtpStatus() {
  const { config, source } = effectiveSmtp();
  return {
    configured: !!config?.host,
    source, // 'database' (saved in /admin/emails) | 'environment' | 'none'
    host: config?.host || null,
    port: config?.port ?? 587,
    secure: !!config?.secure,
    user: config?.user || null,
    // Presence only. The value never leaves the server, not even masked —
    // a masked secret in a JSON payload is still a secret in a JSON payload.
    hasPassword: !!config?.pass,
    from: config?.from || null,
    // Shown so someone editing the mailbox can see an env fallback exists
    // and is being overridden, rather than wondering why nothing changed.
    envAvailable: !!process.env.SMTP_HOST,
    siteUrl: process.env.SITE_URL || "https://internationalbc.fly.dev",
  };
}

export async function verifySmtp() {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      dev: true,
      error: "No mailbox configured — running in dev mode. Fill in the SMTP settings above, or set SMTP_HOST.",
    };
  }
  try {
    await transporter.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function logSend({ to, subject, category, newsletterId, status, messageId, response }) {
  try {
    run(
      `INSERT INTO email_log (to_email, subject, category, newsletter_id, status, message_id, response)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(to || "").slice(0, 320),
        subject ? String(subject).slice(0, 500) : null,
        category || "other",
        newsletterId ?? null,
        status,
        messageId || null,
        response ? String(response).slice(0, 500) : null,
      ]
    );
  } catch (e) {
    // Never let the audit trail break the thing it is auditing.
    console.error("[email] could not write email_log row:", e?.message || e);
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
  category = "other",
  newsletterId = null,
}) {
  const transporter = getTransporter();
  const from =
    effectiveSmtp().config?.from ||
    process.env.FROM_EMAIL ||
    "International Basketball Club Genève <no-reply@international-bc-geneve.local>";
  const recipient = Array.isArray(to) ? to.join(", ") : to;

  if (!transporter) {
    console.log("[email:dev-mode] Would send email:", { to: recipient, subject });
    logSend({ to: recipient, subject, category, newsletterId, status: "dev", response: "no mailbox configured (dev mode)" });
    return { ok: true, dev: true };
  }

  const mail = { from, to: recipient, subject, html, text };

  if (attachments && attachments.length) {
    mail.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    }));
  }

  try {
    const info = await transporter.sendMail(mail);
    logSend({
      to: recipient,
      subject,
      category,
      newsletterId,
      status: "sent",
      messageId: info?.messageId,
      response: info?.response,
    });
    return { ok: true, messageId: info?.messageId, dev: false };
  } catch (e) {
    logSend({
      to: recipient,
      subject,
      category,
      newsletterId,
      status: "failed",
      response: e?.message || String(e),
    });
    // Re-thrown so existing callers (the Monday reminder) keep their own
    // per-recipient try/catch semantics.
    throw e;
  }
}

/**
 * A hard bounce is settled: the mailbox does not exist and it will not
 * exist in 200ms either. Retrying one wastes a send and, repeated, is how
 * a domain earns a reputation problem.
 */
export function isPermanentFailure(error) {
  const code = Number(error?.responseCode || 0);
  if (code >= 500 && code < 600) return true;
  return /5\.1\.[01]|user unknown|no such user|mailbox unavailable/i.test(String(error?.message || ""));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Send one message per recipient — never a BCC blast, because each person
 * gets their own name in the greeting and their own unsubscribe token.
 *
 * @param {Array} messages  [{ to, subject, html, text, category, newsletterId, ref }]
 * @param {{concurrency?: number, delayMs?: number, onResult?: Function}} opts
 * @returns {Promise<Array<{ref, to, ok, messageId, error, permanent}>>}
 */
export async function sendBatch(messages, { concurrency = 5, delayMs = 200, onResult } = {}) {
  const queue = [...messages];
  const results = [];

  async function sendOne(msg) {
    try {
      const info = await sendEmail(msg);
      return { ref: msg.ref, to: msg.to, ok: true, messageId: info?.messageId, dev: !!info?.dev };
    } catch (e) {
      if (isPermanentFailure(e)) {
        return { ref: msg.ref, to: msg.to, ok: false, error: e?.message || String(e), permanent: true };
      }
      // One retry for the transient class: connection reset, greylisting,
      // 4xx "try again later".
      await sleep(500);
      try {
        const info = await sendEmail(msg);
        return { ref: msg.ref, to: msg.to, ok: true, messageId: info?.messageId, retried: true };
      } catch (e2) {
        return { ref: msg.ref, to: msg.to, ok: false, error: e2?.message || String(e2), permanent: false };
      }
    }
  }

  async function worker() {
    while (queue.length) {
      const msg = queue.shift();
      const result = await sendOne(msg);
      results.push(result);
      if (onResult) {
        try {
          await onResult(result, msg);
        } catch (e) {
          console.error("[email] onResult threw:", e?.message || e);
        }
      }
      // A small gap between messages keeps a shared SMTP relay from
      // treating the club's Monday send as a burst worth throttling.
      if (delayMs) await sleep(delayMs);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, messages.length)) }, worker));
  return results;
}
