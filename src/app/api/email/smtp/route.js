import { NextResponse } from "next/server";
import { requireArea, getAccount } from "@/lib/access";
import { smtpStatus } from "@/lib/email";
import { saveSmtpConfig, clearSmtpConfig, getSmtpConfig } from "@/lib/smtp-config";

export const dynamic = "force-dynamic";

// The mailbox, editable from /admin/emails. The password is write-only: it
// goes in through PUT and never comes back out of GET, not even masked.
export async function GET() {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const saved = getSmtpConfig();
  return NextResponse.json({
    status: smtpStatus(),
    saved: saved
      ? {
          host: saved.host,
          port: saved.port,
          secure: saved.secure,
          user: saved.user,
          from: saved.from,
          hasPassword: !!saved.pass,
          updated_at: saved.updated_at,
        }
      : null,
  });
}

export async function PUT(request) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  if (!String(body.host || "").trim()) {
    return NextResponse.json({ error: "host_required" }, { status: 400 });
  }

  const account = await getAccount();
  // An empty `pass` means "leave the stored one alone" — the form never
  // shows the password, so treating blank as "clear it" would wipe a working
  // credential every time someone corrected a typo in the host.
  saveSmtpConfig(
    {
      host: body.host,
      port: body.port,
      secure: body.secure,
      user: body.user,
      from: body.from,
      pass: body.pass,
    },
    account?.id ?? null
  );

  return NextResponse.json({ ok: true, status: smtpStatus() });
}

export async function DELETE() {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  clearSmtpConfig();
  // Env vars, if any, take over again; otherwise the app drops back to
  // dev mode and logs instead of sending.
  return NextResponse.json({ ok: true, status: smtpStatus() });
}
