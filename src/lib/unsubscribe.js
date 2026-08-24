// Unsubscribe tokens: an HMAC of the address, not a row in a table.
//
// A lookup table would mean either a token column on every recipient row
// (churn) or a sequential id in the URL (enumerable — paste ?id=42 and you
// unsubscribe someone else). An HMAC keyed on SESSION_SECRET is stateless,
// unguessable, and verifies without a database read.

import { createHmac, timingSafeEqual } from "node:crypto";

function key() {
  return process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
}

function normalize(email) {
  return String(email || "").trim().toLowerCase();
}

export function unsubscribeToken(email) {
  return createHmac("sha256", key()).update(normalize(email)).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(email, token) {
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(String(token || ""));
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

/** The link that goes in the footer of every newsletter. */
export function unsubscribeUrl(email, siteUrl) {
  const base = String(siteUrl || process.env.SITE_URL || "https://internationalbc.fly.dev").replace(/\/+$/, "");
  const e = encodeURIComponent(normalize(email));
  return `${base}/api/newsletter/unsubscribe?email=${e}&token=${unsubscribeToken(email)}`;
}
