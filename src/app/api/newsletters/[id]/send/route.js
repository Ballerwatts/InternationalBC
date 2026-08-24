import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { requireArea, getAccount } from "@/lib/access";
import { sendEmail } from "@/lib/email";
import { sendNewsletter, renderFor } from "@/lib/newsletter-send";

export const dynamic = "force-dynamic";

// POST { test: true }  -> one copy to the logged-in admin
// POST {}              -> the real send; re-running only picks up rows still
//                         queued or failed, so this doubles as "Retry failed"
export async function POST(request, { params }) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const newsletter = get("SELECT * FROM newsletters WHERE id = ?", [params.id]);
  if (!newsletter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  if (body.test) {
    const account = await getAccount();
    if (!account?.email) return NextResponse.json({ error: "no_admin_email" }, { status: 400 });
    const { html, text } = renderFor(newsletter, { name: account.name, email: account.email });
    const info = await sendEmail({
      to: account.email,
      subject: `[TEST] ${newsletter.subject}`,
      html,
      text,
      category: "test",
      newsletterId: newsletter.id,
    });
    return NextResponse.json({ ok: true, test: true, to: account.email, dev: !!info.dev });
  }

  if (newsletter.status === "sending") {
    return NextResponse.json({ error: "already_sending" }, { status: 409 });
  }

  const result = await sendNewsletter(Number(params.id));
  return NextResponse.json({ ok: true, ...result });
}
