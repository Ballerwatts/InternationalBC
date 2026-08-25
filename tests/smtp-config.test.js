// The mailbox is now editable from /admin/emails, which means a real
// password lives in the database. Two things must hold: it round-trips
// through encryption, and a saved mailbox beats the environment (otherwise
// filling the form in appears to do nothing).
//
//   npm test

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "ibc-smtp-"));
process.env.DATABASE_PATH = join(dir, "test.db");
process.env.SESSION_SECRET = "test-secret";

const { get } = await import("@/lib/db");
const {
  saveSmtpConfig,
  getSmtpConfig,
  clearSmtpConfig,
  effectiveSmtp,
  encryptPassword,
  decryptPassword,
} = await import("@/lib/smtp-config");

const ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "FROM_EMAIL"];

before(() => ENV_KEYS.forEach((k) => delete process.env[k]));
after(() => rmSync(dir, { recursive: true, force: true }));

test("the password round-trips and is not stored in the clear", () => {
  const cipher = encryptPassword("hunter2-app-password");
  assert.notEqual(cipher, "hunter2-app-password");
  assert.ok(!cipher.includes("hunter2"), "the plaintext must not survive in the stored value");
  assert.equal(decryptPassword(cipher), "hunter2-app-password");
});

test("a wrong key yields null rather than throwing", () => {
  const cipher = encryptPassword("secret");
  process.env.SESSION_SECRET = "a-different-secret";
  assert.equal(decryptPassword(cipher), null, "a rotated SESSION_SECRET must not break every send");
  process.env.SESSION_SECRET = "test-secret";
});

test("saving, reading back, and what lands in the table", () => {
  saveSmtpConfig({
    host: "mail.example.ch",
    port: 465,
    secure: true,
    user: "no-reply@example.ch",
    from: "IBBC <no-reply@example.ch>",
    pass: "app-password",
  });

  const config = getSmtpConfig();
  assert.equal(config.host, "mail.example.ch");
  assert.equal(config.port, 465);
  assert.equal(config.secure, true);
  assert.equal(config.pass, "app-password");

  const row = get("SELECT * FROM smtp_config WHERE id = 1");
  assert.ok(!JSON.stringify(row).includes("app-password"), "the row must not hold the plaintext password");
});

test("editing without retyping the password keeps it", () => {
  saveSmtpConfig({ host: "mail2.example.ch", port: 587, user: "no-reply@example.ch", from: "IBBC" });
  assert.equal(getSmtpConfig().pass, "app-password", "a blank password field must not wipe the credential");
  assert.equal(getSmtpConfig().host, "mail2.example.ch");
});

test("a saved mailbox beats the environment, and deleting hands it back", () => {
  process.env.SMTP_HOST = "env.example.ch";
  process.env.SMTP_PORT = "25";

  let live = effectiveSmtp();
  assert.equal(live.source, "database");
  assert.equal(live.config.host, "mail2.example.ch");

  clearSmtpConfig();
  live = effectiveSmtp();
  assert.equal(live.source, "environment");
  assert.equal(live.config.host, "env.example.ch");

  ENV_KEYS.forEach((k) => delete process.env[k]);
  assert.equal(effectiveSmtp().source, "none");
});

test("only one row is ever kept", () => {
  saveSmtpConfig({ host: "a.example.ch", pass: "x" });
  saveSmtpConfig({ host: "b.example.ch" });
  const rows = get("SELECT COUNT(*) AS n FROM smtp_config");
  assert.equal(rows.n, 1);
  assert.equal(getSmtpConfig().host, "b.example.ch");
});
