// The club's outgoing mailbox, stored in the database so an admin can set
// it up from /admin/emails without a redeploy — with the env vars still
// working as the fallback they always were.
//
// Precedence: a saved configuration wins over the environment. That is the
// point of the screen — someone who fills the form in expects mail to start
// going out, not to be silently overruled by a secret they cannot see. The
// panel says which source is live so the two never quietly disagree.
//
// Server-only: imports db, and handles a plaintext password.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { get, run } from "@/lib/db";

/**
 * The mailbox password is the one reversible secret this app stores — a
 * bcrypt hash is useless to an attacker, an SMTP password is a working
 * mailbox. Encrypting it means a leaked database file is not also a leaked
 * mailbox unless SESSION_SECRET leaked with it.
 */
function key() {
  const secret = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
  return scryptSync(secret, "ibc-smtp-config", 32);
}

export function encryptPassword(plain) {
  if (!plain) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

export function decryptPassword(stored) {
  if (!stored) return null;
  try {
    const [iv, tag, data] = String(stored).split(":");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key or a corrupt row — most likely SESSION_SECRET was rotated.
    // Treat it as "no password saved" rather than throwing on every send;
    // the panel shows the password as unset so someone re-enters it.
    return null;
  }
}

/** The saved row, or null. Includes the decrypted password — never serialise this. */
export function getSmtpConfig() {
  const row = get("SELECT * FROM smtp_config WHERE id = 1");
  if (!row || !row.host) return null;
  return {
    host: row.host,
    port: Number(row.port || 587),
    secure: !!row.secure,
    user: row.username || null,
    pass: decryptPassword(row.password_enc),
    from: row.from_email || null,
    updated_at: row.updated_at,
  };
}

/**
 * @param {{host,port,secure,user,from,pass?}} input
 *   `pass` omitted or empty keeps whatever password is already stored, so
 *   editing the host does not silently wipe the credential the form never
 *   showed you.
 */
export function saveSmtpConfig(input, userId = null) {
  const existing = get("SELECT password_enc FROM smtp_config WHERE id = 1");
  const password_enc = input.pass ? encryptPassword(input.pass) : existing?.password_enc || null;

  run(
    `INSERT INTO smtp_config (id, host, port, secure, username, password_enc, from_email, updated_at, updated_by)
     VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
     ON CONFLICT(id) DO UPDATE SET
       host = excluded.host,
       port = excluded.port,
       secure = excluded.secure,
       username = excluded.username,
       password_enc = excluded.password_enc,
       from_email = excluded.from_email,
       updated_at = datetime('now'),
       updated_by = excluded.updated_by`,
    [
      String(input.host || "").trim() || null,
      Number(input.port || 587),
      input.secure ? 1 : 0,
      String(input.user || "").trim() || null,
      password_enc,
      String(input.from || "").trim() || null,
      userId,
    ]
  );
  return getSmtpConfig();
}

/** Delete the saved mailbox. Env vars, if any, take over again. */
export function clearSmtpConfig() {
  run("DELETE FROM smtp_config WHERE id = 1");
}

/** What the environment offers, with no database involved. */
export function envSmtpConfig() {
  if (!process.env.SMTP_HOST) return null;
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.FROM_EMAIL || null,
  };
}

/**
 * What the sender should actually use.
 * @returns {{config: object|null, source: 'database'|'environment'|'none'}}
 */
export function effectiveSmtp() {
  const saved = getSmtpConfig();
  if (saved) return { config: saved, source: "database" };
  const env = envSmtpConfig();
  if (env) return { config: env, source: "environment" };
  return { config: null, source: "none" };
}
