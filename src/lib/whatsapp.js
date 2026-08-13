// Minimal WhatsApp sender via Twilio's WhatsApp API, using plain fetch (no
// SDK dependency — same pattern as the old Resend email integration).
//
// Required env vars in production: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_WHATSAPP_FROM (e.g. "whatsapp:+14155238886" — Twilio's sandbox
// number while testing, or your approved WhatsApp Business number once
// live). See .env.example and README "WhatsApp reminders".
//
// Falls back to logging in development so the app still runs with zero
// WhatsApp provider configured. Recipient numbers must be in E.164 format
// (e.g. +41791234567) — this comes from players.phone.

export async function sendWhatsApp({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    console.log("[whatsapp:dev-mode] Would send WhatsApp message:", { to, body });
    return { ok: true, dev: true };
  }
  if (!to) {
    return { ok: false, error: "no_phone" };
  }

  const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const params = new URLSearchParams({ From: from, To: toWhatsApp, Body: body });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio WhatsApp error ${res.status}: ${errBody}`);
  }

  return { ok: true };
}
