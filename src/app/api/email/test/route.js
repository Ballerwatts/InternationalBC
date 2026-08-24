import { NextResponse } from "next/server";
import { requireArea, getAccount } from "@/lib/access";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// A one-line "does mail leave this box at all" check, separate from any
// newsletter. Defaults to the logged-in admin's own address.
export async function POST(request) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const account = await getAccount();
  const body = await request.json().catch(() => ({}));
  const to = body.to || account?.email;
  if (!to) return NextResponse.json({ error: "no_recipient" }, { status: 400 });

  try {
    const info = await sendEmail({
      to,
      subject: "IBBC — SMTP test",
      html: "<p>This is a test message from the IBBC website. If you can read it, SMTP is working.</p>",
      text: "This is a test message from the IBBC website. If you can read it, SMTP is working.",
      category: "test",
    });
    return NextResponse.json({ ok: true, to, dev: !!info.dev });
  } catch (e) {
    return NextResponse.json({ ok: false, to, error: String(e?.message || e) }, { status: 502 });
  }
}
